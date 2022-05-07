# restaurant-rating
Example of a small Lambda-based application for a public restaurant rating API.

This contains files for two lambdas, one for getting the current average rating and information for a restaurant, and the other for posting a new rating.

The Lambdas are exposed through API Gateway as a REST API.

The GET Method expects the following JSON object in the request body

```sh
{
  "Name": "<String>"
}
```

The POST Method expects the following JSON object in the request body

```sh
{
  "Name": "<String>",
  "Address": "<String>",
  "Description": "<String>",
  "Hours": {
    "Sunday": "<String>",
    "Monday": "<String>",
    "Tuesday": "<String>",
    "Wednesday": "<String>",
    "Thursday": "<String>",
    "Friday": "<String>",
    "Saturday": "<String>"
  },
  "Rating": <Number>
}
```

This approach uses S3 as a kind of data pool, where the data layer is simply files in a S3 bucket, which is declared as an environment variable for the lambda environments. Ratings are appended to a CSV file with two columns, a generated ID for each review and the review itself. If no details file is present in the directory for a given restaurant, the request body of the POST request will be used to create a details JSON file.

The lambdas are fairly straightforward in what they do. The lambda hooked up to the GET method will return the current average rating and details for a restaurant from S3. The lambda hooked up to the POST method will create the files for the restaurant if they don't yet exist, or add the rating to the ratings CSV file if it does already exist. Additionally, if a new rating comes in below the current average for that restaurant, an email is sent using SES to an email address declared as an environment variable.

Given more time I would like to have built up some test cases with Mocha, as for now testing has been limited to the built in Test functionality of Lambda and using Postman to run a few examples through the API. There's also better validation of the incoming data that could be done, as for now it simply checks for data type and if text is a resonable size.
