/**
 * Lambda to take in a request for a rating and save the rating.
 */ 
 'use strict';
 const AWS = require('aws-sdk');
 const Utils = require('utils.js');
 
 /** Entry point for the lambda */
 exports.handler = async (event, context) => {
     console.log('Received event:', JSON.stringify(event, null, 2));
 
     const headers = {
         'Content-Type': 'application/json',
     };
 
     try {
         await Utils.validateRatingsPost(event);
         const ratingBelowAverage = await Utils.insertRating(event);
         await Utils.checkAndAddDetails(event);
 
         console.log(`Rating recevied lower than existing average: ${ratingBelowAverage}`);
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
         body: 'success'
     };
 };
 