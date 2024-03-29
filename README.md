# Voice enabled food listing example for [Speechly](https://www.speechly.com/)

The nodejs application in this repository features a complete example of a voice enabled meal tracking or food listing (e.g. grocery shopping) application power by a _backend integration_ to the Speechly API. The application uses the open source food and nutrition database [Fineli](https://fineli.fi/fineli/en/ohje/19), which contains information about 4 000 food items (with average nutrient contents) and is maintained by the Finnish National Institute for Health and Welfare.

The natural language understanding (NLU) configuration on the backend supports amount, unit and food name combinations. Example things to try out:

- three liters of milk
- pears, rye bread, 2 kilos of potatoes

NOTE: This is a more involved example. For a simple "hello world" tutorial, please refer to [the start repository](https://github.com/speechly/start). If you have no idea on what Speechly is, you can start [here](https://www.speechly.com/blog/what-is-speechly/) or our website [frontpage](https://www.speechly.com/).

## Features in this example

- Simple web user interface, hosted at `/`
- React.js application, built with `npx create-react-app`, hosted at `/app`
- WebSocket connection between clients and this service
- gRPC connection per client WebSocket to Speechly API
- Querying Fineli nutrition data based using Speechly's NLU transcripts

## Requirements

- node 12 or later
- an application id from Speechly

To get an application id apply to our beta program by sending an email to [appid@speechly.com](mailto:appid@speechly.com).

## Building and running the service

Build the application

    npm install

Start the service:

    APP_ID=<your appid> node index.js

If you prefer a Docker setup, there's a Dockerfile included. Just build it, and give the application id as an ENV variable to `docker run`.

By default the service is listening on port `8080`.

If you want to store the audio streamed to the service for debugging purposes, set environment variable `RECORD_WAV=/tmp`; the value will be a path for written files. If enabled, audio is written as wav files to the path. The filename is logged out as a debug log per every utterance.

## Using the service

When it's running, open a browser instance at http://localhost:8080 or wherever you mounted it.

To use it, press the connect button and allow microphone access. After allowing it, you can push
the green button and speak a product query in the microphone. Keep the button pressed down while speaking.

You should see the results being displayed in the screen _as you speak_!

Note that the language for the service is defined in your application configuration. If your application serves multiple
languages, you must define the language code for every connection started. This is done by adding the URL parameter
`languageCode` with the full language identifier (eg. `en-US`, `fi-FI`) when opening the web socket.
See the [client WebSocket opening](www/sg.js) code.

## API overview for a push-to-talk application:

1. Connect to a WebSocket at address wss://foobar
2. When the user pushes a button to talk send a start event. The server will respond with an utterance id
3. Send audio chunks (max. size 1 megabyte) as binary frames
4. Receive transcribed content from the server, tagged with the utterance id
5. Send end event when the user releases the button. Transcribes keeps coming until all of the audio has been processed.
6. Repeat 3. when the user wants to talk again
7. Close the connection when the user quits the application

## API

All API calls are WebSocket text frames or audio binary frames. See the documentation of your WebSocket library for details how to send text/binary frames. Most of them has either a different function call for sending different type of frames.

*NOTE:* It is very important to undestand the difference between text and binary frames. As control messages and audio data is separated by the frame type.

Audio format has to be 16bit linear encoded PCM audio. Preferably with 16kHz sample rate to reduce bandwidth.

Connect to the WebSocket URL `wss://your-grocery-host?sampleRate=16000&languageCode=fi` where the sample rate and language code are the ones you use.

### Audio loop

When connected, send the following event to start transcribing audio:

```json
{"event": "start"}
```

The start event corresponds to a user tapping and holding a button to speak. The server responds with an utterance id:

```json
{"event": "started", "data": {"utteranceId": "xxxx-xxxx-xxxx"}}
```

The utterance id can be used to match transcriptions to specific utterance sessions. When the client ends the recording, the server can still send transcriptions for that session.

With an open utterance session, send audio as WebSocket binary frames. The audio should be streamed as close to real-time as possible and all audio chunks must be under one megabyte.

The server starts streaming transcription events:

```json
{"event": "transcription", "data": {"utteranceId": "xxxx-xxxx-xxxx", "data": {}}}
```

The `data` object in the transcription contains all the data related to the utternace the format is:

`type`: Either `interimItem` or `finalItem`; where `interimItem` means that the results might still change and `finalItem` means that the results in this event are final and will not change. The interim data can be used to show feedback to the user immediately.

`utteranceId`: The id of this utterance, which matches the `utteranceId` from the `started` event.

`segments`: Is a complex data structure that contains transcription and NLU annotated results.

The fields in `segments` are domain specific and depends on the data used, the format the web example expects is:

```json
{"segments": [
    {"transcript": "what the user said",
     "products": [
         {
             "amount": 1,
             "unitName": "l",
             "displayText": "exact name of the product"
         }
     ]}
]}
```

The `products` is an array of multiple choices found for the utterance.

When the user stops holding the record button, send an end event to notify that there will be no more speech:

```json
{"event": "stop"}
```

If the stop event is not sent, the server might not send the final few utterances unless there is extra silence at the end of the session. The server will close the utterance session if it doesn't receive audio for a while.

The server sends the following stopped event when a transcription is finished. May contain an optional error message if stopped because of an error.

```json
{"event": "stopped", "data": {"utteranceId": "xxxx-xxxx-xxxx", "error": {"code": "G01", "message": "Internal error"}}}
```

Before closing the connection, send the following event to let the server close the connection after all utterances has been sent:

```json
{"event": "quit"}
```
