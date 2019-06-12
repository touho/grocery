const R = require("ramda");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const queryString = require("query-string");
const protoLoader = require("@grpc/proto-loader");
const grpc = require("grpc");

const logger = console;

const appId = process.env.APP_ID;
if (appId === undefined) {
  throw new Error("APP_ID environment variable needs to be set");
}

let sgApiUrl;
let creds;
if (process.env.SG_API_URL) {
  sgApiUrl = process.env.SG_API_URL;
  creds = grpc.credentials.createInsecure();
} else {
  sgApiUrl = "api.speechgrinder.com";
  creds = grpc.credentials.createSsl();
}

logger.debug(`Using ${sgApiUrl} with appId "${appId}"`);

const productSearch = require("./search");

const SgGrpc = grpc.loadPackageDefinition(
  protoLoader.loadSync("sg.proto", {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
);

const errors = {
  S01: "Invalid session",
  C01: "Client version too old",
  G01: "General failure"
};

const processError = websocket => error => {
  if (websocket.readyState === 1) {
    if (error.code == 11) {
      logger.error(error.details);
      return;
    }
    logger.error(error);
    logger.error("Sending error message to client...");
    websocket.send(JSON.stringify({ event: "error", data: { error: error.message, code: "G01" } }));
    logger.error("Closing websocket...");
  }
};

const createProductQuery = (tokens, lang, maxProducts) => {
  const langUnit = lang === "fi" ? "kpl" : "pcs";

  const queryTokens = tokens.filter(token => token.entityType === "query");
  const unitTokens = tokens.filter(token => token.entityType === "unit" && token.text !== "of");
  const amountTokens = tokens.filter(token => token.entityType === "amount" && !isNaN(token.text));

  const unit = unitTokens.length > 0 ? unitTokens[0].lemma : langUnit;
  const amount = amountTokens.length > 0 ? parseFloat(amountTokens[0]) : 1;

  return {
    transcript: tokens.map(token => token.textWithTrailingSpace).join(""),
    query: queryTokens.map(token => token.textWithTrailingSpace).join(""),
    normalizedQuery: queryTokens.map(token => token.lemma.replace("#", "")).join(" "),
    compounds: queryTokens.flatMap(token => token.lemma.split("#")),
    amount: amount,
    unit: unit,
    maxProducts: maxProducts,
    lang: lang
  };
};

const findSegmentsFromUtterance = utterance => {
  const starts = utterance.tokens
    .map((token, i) => ({ isSegmentStart: token.isSegmentStart, i: i }))
    .filter(token => token.isSegmentStart)
    .map(token => token.i);
  const ends = starts.slice(1, starts.length).concat([utterance.tokens.length]);
  return starts.map((start, i) => utterance.tokens.slice(start, ends[i]));
};

const findProducts = (utteranceData, languageCode) => {
  const language = languageCode.slice(0, 2);
  const utterance = utteranceData.alternatives[0];
  try {
    const segments = findSegmentsFromUtterance(utterance);
    const productQueries = segments.map(tokens => createProductQuery(tokens, language, 5));
    return productQueries.map(query => productSearch.queryProducts(query));
  } catch (err) {
    logger.debug("Failed to handle product query");
    logger.debug(err);
    return [];
  }
};

const processData = (websocket, languageCode) => {
  return data => {
    if (websocket.readyState !== 1) {
      // client websocket is not writable, ignore result
      return;
    }
    if (data.started !== undefined) {
      // slu api returns an utterance id
      websocket.send(JSON.stringify({ event: "started", data: data.started }));
    } else if (data.finished !== undefined) {
      websocket.send(JSON.stringify({ event: "stopped", data: data.finished }));
    } else {
      const productSegments = findProducts(data.utterance, languageCode);
      if (websocket.readyState === 1 && !R.isEmpty(productSegments)) {
        try {
          websocket.send(
            JSON.stringify({
              event: "transcription",
              data: { utteranceId: data.utterance.utteranceId, type: data.utterance.type, segments: productSegments }
            })
          );
        } catch (err) {
          processError(websocket)(err);
        }
      }
    }
  };
};

const handler = (ws, token, params) => {
  const sampleRateHertz = params.sampleRate ? parseInt(params.sampleRate) : 48000;
  const languageCode = params.languageCode || "en-US";

  const config = {
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode
  };

  logger.debug(`WebSocket opened with parameters ${JSON.stringify(config)}`);

  const client = new SgGrpc.speechgrinder.sgapi.v1.Slu(sgApiUrl, creds);
  const metadata = new grpc.Metadata();
  metadata.add("Authorization", `Bearer ${token}`);
  const recognizer = client.Stream(metadata);
  recognizer.write({ config });
  recognizer.on("error", processError(ws));
  recognizer.on("data", processData(ws, languageCode));

  ws.on("error", error => {
    logger.error("ws got error");
    logger.error(error);
    recognizer.end();
  });

  ws.on("message", message => {
    if (typeof message === "string") {
      // command event, not audio
      const event = JSON.parse(message);
      if (event.event === "start") {
        return recognizer.write({ event: { event: "START" } });
      } else if (event.event === "stop") {
        return recognizer.write({ event: { event: "STOP" } });
      } else if (event.event === "quit") {
        return recognizer.end();
      } else {
        logger.debug("Invalid message from a client:");
        logger.debug(message);
        return ws.send(
          JSON.stringify({ event: "error", data: { code: "C01", details: "Unknown event from the client" } })
        );
      }
    } else {
      // audio data
      if (recognizer.writable) {
        try {
          recognizer.write({ audio: message });
        } catch (err) {
          logger.error("Error in handling binary message from client");
          logger.error(err);
          ws.send(
            JSON.stringify({
              event: "error",
              data: { error: err, code: "G01" }
            })
          );
        }
      }
    }
  });
  ws.on("close", () => {
    logger.debug("Client WebSocket closed");
    recognizer.end();
  });
};

const kParams = Symbol("session");
const kToken = Symbol("token");
const kError = Symbol("error");

const createToken = deviceId => {
  const client = new SgGrpc.speechgrinder.sgapi.v1.Identity(sgApiUrl, creds);
  return new Promise((resolve, reject) => {
    client.login({ deviceId, appId: "sok" }, (err, response) => {
      if (err) {
        return reject(err);
      }
      logger.debug(`Created new token ${response.token}`);
      return resolve(response.token);
    });
  });
};

const verifyClient = (info, cb) => {
  const url = info.req.url;
  const queryStr = url.split("?")[1];
  if (queryStr === undefined) {
    return Promise.reject(new Error("Missing query string"));
  }

  // the deviceId could be something more device specific!
  const deviceId = info.req.headers["user-agent"];

  info.req[kParams] = queryString.parse(queryStr);
  return Promise.resolve()
    .then(() => {
      // TODO: find token from cookie or local storage
      const token = info.req.headers.jwt;
      if (token === undefined) {
        return createToken(deviceId);
      }
      return Promise.resolve(token);
    })
    .then(token => {
      // TODO: store the token as cookie or local storage
      info.req[kToken] = token;
    })
    .catch(err => {
      const code = err.message || "G01";
      info.req[kError] = JSON.stringify({
        event: "error",
        data: {
          error: errors[code],
          code: code
        }
      });
    })
    .then(() => {
      // verify always succeeds, errors are sent as a WebSocket message
      cb(true);
    });
};

const handleWebSocketConnection = (ws, req) => {
  // the request is already verified by verifyClient
  if (req.hasOwnProperty(kError)) {
    logger.error("Sending error to client", req[kError]);
    ws.send(req[kError]);
    ws.close();
  } else {
    handler(ws, req[kToken], req[kParams]);
  }
};

const bindWebSocket = server => {
  const ws = new WebSocket.Server({ perMessageDeflate: false, server, verifyClient });
  ws.on("connection", handleWebSocketConnection);
};

process.on("unhandledRejection", (reason, p) => {
  logger.error("Unhandled rejection");
  logger.error(reason);
});

process.on("uncaughtException", err => {
  logger.error("Uncaught exception cxdgaught, logging and exiting");
  logger.error(err);
  process.exitCode = 2;
});

const shutdown = () => {
  logger.info("Shutdown requested");
  process.exit();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

const httpApp = express();
httpApp.get("/", (req, res) => {
  const baseUrl = req.headers["x-envoy-original-path"] || req.baseUrl;
  res.redirect(baseUrl + "/index.html");
});
httpApp.use(express.static("www", { index: false }));

const httpServer = http.createServer(httpApp);
bindWebSocket(httpServer);

const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
  logger.info(`HTTP Server listening on port: ${port}`);
});
