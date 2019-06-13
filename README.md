# Example integration to Speechgrinder API

The nodejs application in this repository is an example of a _backend integration_  to the Speechgrinder API.

- User interface, hosted at `/`
- WebSocket connection between clients and this service
- gRPC connection per client WebSocket to Speechgrinder API

## Building and running the service

- build the application with `npm install`.
- get some example data, see [the data directory](data)
- get yourself an application id from Speechgrinder

After you get your application id, you can start the service:

    APP_ID=<your appid> node index.js

If you prefer a Docker setup, there's a Dockerfile included. Just build it, and give the application id as an ENV variable to `docker run`.

By default the service is listening on port `8080`.

## Using the service

When it's running, open a browser instance at http://localhost:8080 or wherever you mounted it.

To use it, press the connect button and allow microphone access. After allowing it, you can push
the green button and speak a product query in the microphone. Keep the button pressed down while speaking.

You should see the results being displayed in the screen _as you speak_!
