/**
 * Lambda to get the current average rating for a restaurant.
 */
 'use strict';
 const AWS = require('aws-sdk');
 const Utils = require('utils.js');
 
 /** Entry point for the lambda */
 exports.handler = async (event, context) => {
     console.log('Received event:', JSON.stringify(event, null, 2));
 
     let details = {};
     const headers = {
         'Content-Type': 'application/json',
     };
 
     try {
         const [average, s3details] = await Promise.all([
             Utils.getAverageFromDataPool(event['Name']),
             Utils.getDetailsFromDataPool(event)
         ]);
         details = s3details;
         details.average = average;
     }
     catch (err) {
         if (typeof err == 'object' && err.hasOwnProperty('httpStatus')) {
             err.awsRequestId = context.awsRequestId;
             throw JSON.stringify(err);
         }
         else {
             throw JSON.stringify({
                 awsRequestId: context.awsRequestId,
                 httpStatus: 500,
                 body: err.message
             });
         }
     }
 
     return {
         awsRequestId: context.awsRequestId,
         httpStatus: 200,
         headers,
         body: JSON.stringify(details)
     };
 };
 