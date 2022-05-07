/** Utilities for using S3 as a data pool */
'use strict';
const S3 = require('aws-sdk/clients/s3');
const client = new S3();
const { v1: uuidv1 } = require('uuid');

const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Get the rating for a given restaurant.
 * 
 * @param The restaurant name.
 */
exports.getAverageFromDataPool = async (restaurant) => {
    console.log(`Getting average rating for ${restaurant}`);
    const params = {
        Bucket: `${process.env.s3_bucket}/${restaurant}`,
        Key: `ratings.csv`,
        ExpressionType: 'SQL',
        Expression: 'SELECT AVG(cast(rating as float)) FROM s3object',
        InputSerialization: {
            CSV: {
                FileHeaderInfo: 'USE',
                RecordDelimiter: '\n',
                FieldDelimiter: ','
            }
        },
        OutputSerialization: {
            CSV: {}
        }
    };
    try {
        await client.headObject({ "Bucket": `${process.env.s3_bucket}/${restaurant}`, "Key": `ratings.csv` }).promise();
        console.log("File Found in S3");
    }
    catch (err) {
        console.log("File not Found ERROR : " + err.code);
        return undefined;
    }

    return new Promise((resolve, reject) => {
        client.selectObjectContent(params, (err, data) => {
            if (err) {
                console.log(JSON.stringify(err));
                reject(err);
            }

            // data.Payload is a Readable Stream
            const eventStream = data.Payload;

            let records = [];

            // Read events as they are available
            eventStream.on('data', (event) => {
                console.log(JSON.stringify(event));
                if (event.Records) {
                    records.push(event.Records.Payload);
                }
                else if (event.Stats) {
                    console.log(`Processed ${event.Stats.Details.BytesProcessed} bytes`);
                }
                else if (event.End) {
                    console.log('SelectObjectContent completed');
                }
            }).on('error', (err) => {
                console.log(JSON.stringify(err));
                reject(err);
            }).on('end', () => {
                // Finished receiving events from S3
                let stringBuffer = Buffer.concat(records).toString('utf8');
                resolve(+(Number(stringBuffer).toFixed(2)));
            });
        });
    });
};

/**
 * Get the details for a given restaurant.
 * 
 * @param event The incoming lambda event
 */
exports.getDetailsFromDataPool = async (event) => {
    console.log(`Gathering details for restaurant ${event['Name']}`);
    const params = {
        Bucket: `${process.env.s3_bucket}/${event['Name']}`,
        Key: `details.json`
    };

    try {
        const data = await client.getObject(params).promise();
        return JSON.parse(data.Body.toString());
    }
    catch (err) {
        console.log(JSON.stringify(err));
        if (err.code === 'NoSuchKey') {
            return {
                "Name": event['Name'],
                "Address": "unknown",
                "Description": "unkown",
                "Hours": "unknown"
            };
        }
    }
};

/**
 * Check for the details for a given restaurant and add them if they don't exist.
 * 
 * @param event The incoming lambda event
 */
exports.checkAndAddDetails = async (event) => {
    console.log(`Checking for details for restaurant ${event['Name']}`);
    const params = {
        Bucket: `${process.env.s3_bucket}/${event['Name']}`,
        Key: `details.json`
    };
    try {
        await client.headObject(params).promise();
        console.log("File Found in S3");
        // Nothing to do.
    }
    catch (err) {
        console.log("File not Found ERROR : " + err.code);
        // Add the details.
        let details = {
            "Name": event['Name'],
            "Address": event['Address'],
            "Description": event['Description'],
            "Hours": event['Hours'],
        };
        let putParams = {
            Bucket: '${process.env.s3_bucket}/' + event['Name'],
            Key: 'details.json',
            ContentType: 'binary',
            Body: Buffer.from(JSON.stringify(details), 'binary')
        };
        await client.putObject(putParams).promise();
    }
};

/**
 * Add a new rating for a restaurant.
 * 
 * @param rating The event object with restaurant and rating info.
 */
exports.insertRating = async (rating) => {
    let ratingValue = +((rating["Rating"]).toFixed(2));

    let currentAvg = await exports.getAverageFromDataPool(rating['Name']);

    console.log(`Current Average: ${currentAvg}`);

    // Get ratins file for a given restaurant.
    const params = {
        Bucket: `${process.env.s3_bucket}/${rating['Name']}`,
        Key: `ratings.csv`
    };

    const ratingUid = uuidv1();

    let newFile = false;
    let ratingsString;

    try {
        await client.headObject(params).promise();
        console.log("File Found in S3");
        // Add the rating to the existing file.
        const ratingsData = await client.getObject(params).promise();
        ratingsString = ratingsData.Body.toString();
    }
    catch (err) {
        console.log("File not Found ERROR : " + err.code);
        newFile = true;
    }
    if (newFile) {
        // Create a new file with the first rating.
        ratingsString = `id,rating\n${ratingUid},${ratingValue}`;
    }
    else {
        // Add the new rating to the existing ratings.
        ratingsString += `\n${ratingUid},${ratingValue}`;
    }

    let putParams = {
        Bucket: `${process.env.s3_bucket}/${rating['Name']}`,
        Key: 'ratings.csv',
        ContentType: 'binary',
        Body: Buffer.from(ratingsString, 'binary')
    };
    await client.putObject(putParams).promise();

    if (ratingValue < currentAvg) {
        return true;
    }
    return false;
};

/**
 * Do some validation of the incoming event.
 * 
 * @param event The incoming lambda event
 */
exports.validateRatingsPost = (event) => {
    if (typeof(event['Name']) != 'string' || event['Name'].length > 50) {
        throw ({ "message": "Name must be text and at most 50 characters" });
    }
    if (typeof(event['Description']) != 'string' || event['Name'].length > 250) {
        throw ({ "message": "Description must be text and at most 250 characters" });
    }
    if (typeof(event['Address']) != 'string' || event['Name'].length > 150) {
        throw ({ "message": "Address must be text and at most 150 characters" });
    }
    if (typeof(event['Hours']) != 'object') {
        throw ({ "message": "Hours must be a valid object" });
    }
    validateHours(event['Hours']);
    if (Number.isNaN(Number(event['Rating']))) {
        throw ({ "message": "Rating must be a number" });
    }
    else if (event['Rating'] < 1 || event['Rating'] > 5) {
        throw ({ "message": "Rating must more than 1 and less than 5" });
    }
};

/**
 * Get the details for a given restaurant.
 * 
 * @param hours
 */
const validateHours = (hours) => {
    for (let i = 0; i < daysOfWeek.length; i++) {
        if (!hours.hasOwnProperty(daysOfWeek[i])) {
            throw ({ "message": `Hours must include day: ${daysOfWeek[i]}` });
        }
    }
    let hoursKeys = Object.keys(hours);
    for (let i = 0; i < hoursKeys.length; i++) {
        if (daysOfWeek.indexOf(hoursKeys[i]) < 0) {
            throw ({ "message": `Hours includes invalid attribute ${hoursKeys[i]}` });
        }
        else if (typeof(hours[hoursKeys[i]]) != 'string' || hours[hoursKeys[i]].length > 50) {
            throw ({ "message": `Hours for ${hoursKeys[i]} must be text and at most 50 characters` });
        }
    }
};
