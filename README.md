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