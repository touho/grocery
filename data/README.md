# Data directory

This directory contains the food and nutrition data that is queried with the SLU data returned from the SLU API. 

To rebuild the data index your self following the instructions on [Compiling data](#compiling-data)

## Requirements

- node 12 or later 
- an application id from Speechgrinder

To get an application id apply to our beta program by sending an email to [appid@speechgrinder.com](mailto:appid@speechgrinder.com).

## Compiling data 

Install node 

    npm install

Recompile data:

    APP_ID=<your appid> node installData.js
