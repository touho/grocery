const R = require("ramda");
const express = require("express");
const http = require("http");
const WebSocket = require("ws");
const queryString = require("query-string");
const protoLoader = require("@grpc/proto-loader");
const grpc = require("grpc");
const crypto = require("crypto");
const wav = require("wav");
const path = require("path");
const schema = require("./schema");
const logger = console;

const shouldEnforceSchema = process.env.ASSERT_SCHEMA == "true";
const appId = process.env.APP_ID;
if (appId === undefined) {
  throw new Error("APP_ID environment variable needs to be set");
}

// you can tune alpha between 0.0 - 1.0 to control how much
// the product score influences which utterance alternative is selected
const alpha = process.env.ALPHA ? parseFloat(process.env.ALPHA) : 0.1;
console.log("alpha", alpha);

const wavFilePath = process.env.RECORD_WAV;
const isWavRecorderEnabled = !!wavFilePath;

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
  S02: "Invalid deviceId",
  C01: "Client version too old",
  G01: "General failure"
};

const processError = websocket => error => {
  if (websocket.readyState === 1) {
    if (error && error.code == 11) {
      logger.error(error.details);
      return;
    }
    logger.error("Error caught:", error);
    logger.error("Sending error message to client...");
    websocket.send(JSON.stringify({ event: "error", data: { error: error.message, code: "G01" } }));
    logger.error("Closing websocket...");
  }
};

const createProductQuery = (tokens, entitySpans, lang, maxProducts) => {
  const getSpanIndex = name => entitySpans.map(span => span.label).indexOf(name);
  const getSpan = index => (index >= 0 ? entitySpans[index] : { start: 0, end: 0 });
  const getTokens = span => tokens.slice(span.start, span.end);
  const getEntity = R.pipe(
    getSpanIndex,
    getSpan,
    getTokens
  );

  const queryTokens = getEntity("query");
  const unitTokens = getEntity("unit").filter(
    token => token.text !== "of" && token.text !== "a" && token.text !== "an"
  );
  const amountTokens = getEntity("amount").filter(token => !isNaN(token.text));

  const hasUnit = unitTokens.length > 0;
  const hasAmount = amountTokens.length > 0;
  const unit = hasUnit
    ? unitTokens
        .map(t => t.lemma)
        .map(t => t.replace("#", ""))
        .join(" ")
    : "default";
  const amount = hasAmount ? parseFloat(amountTokens[0].text) : 1;

  return {
    transcript: tokens.map(token => token.textWithTrailingSpace).join(""),
    query: queryTokens.map(token => token.textWithTrailingSpace).join(""),
    normalizedQuery: queryTokens.map(token => token.lemma.replace("#", "")).join(" "),
    compounds: queryTokens.flatMap(token => token.lemma.split("#")),
    amount: amount,
    unit: unit,
    maxProducts: maxProducts,
    lang: lang,
    hasTime: entitySpans.map(span => span.label).indexOf("time") > -1,
    hasUnit: hasUnit,
    hasAmount: hasAmount
  };
};

const numOfNonEntityTokens = tokens => {
  return tokens.reduce((count, token) => (token.positionInEntity === "outsideOf" ? count + 1 : count), 0);
};

const getSpansByStart = (tokens, isStartOfSpan) => {
  const starts = tokens
    .map((token, i) => ({ isStart: isStartOfSpan(token), i: i }))
    .filter(token => token.isStart)
    .map(token => token.i);
  const ends = starts.slice(1, starts.length).concat([tokens.length]);
  return starts.map((start, i) => ({ start: start, end: ends[i] }));
};

const getEntitySpans = tokens => {
  return getSpansByStart(tokens, token => token.positionInEntity === "startOf").map(span => {
    return {
      label: tokens[span.start].entityType,
      start: span.start,
      end: span.end - numOfNonEntityTokens(tokens.slice(span.start, span.end))
    };
  });
};

const findSegments = utterance => {
  return getSpansByStart(utterance.tokens, token => token.isSegmentStart).map(span =>
    utterance.tokens.slice(span.start, span.end)
  );
};

const findSegmentsWithProducts = (utterance, language) => {
  try {
    const segments = findSegments(utterance);
    const queriesForSegments = segments.map(tokens => createProductQuery(tokens, getEntitySpans(tokens), language, 5));
    return queriesForSegments.map(query => productSearch.queryProducts(query));
  } catch (err) {
    logger.debug("Failed to handle product query");
    logger.debug(err);
    return [];
  }
};

const softMax = values => {
  const exponents = values.map(Math.exp);
  const total = exponents.reduce((a, b) => a + b, 0);
  return exponents.map(exp => exp / total);
};

const parseProductSegments = utteranceData => {
  const language = utteranceData.languageCode.slice(0, 2);
  const confidences = softMax(utteranceData.alternatives.map(alternative => alternative.confidence));
  const alternativeSegments = utteranceData.alternatives.map(alternative =>
    findSegmentsWithProducts(alternative, language)
  );
  const scores = softMax(alternativeSegments.map(alt => alt.map(seg => seg.score).reduce((x, y) => x + y, 0.0)));
  const bestSegments =
    alternativeSegments.length > 0
      ? alternativeSegments
          .map((segments, i) => ({ segments: segments, score: Math.log(confidences[i]) + alpha * Math.log(scores[i]) }))
          .reduce((best, current, i) => (i === 0 ? current : current.score > best.score ? current : best)).segments
      : [];

  return bestSegments;
};

class NullWavWriter {
  constructor() {}
  start() {}
  write() {}
  stop() {}
  forceStop() {}
}

class WavWriter {
  constructor(sampleRate) {
    this.sampleRate = sampleRate;
    this.writer = undefined;
    this.utteranceId = undefined;
    this.currentFile = undefined;
  }

  start(utteranceId) {
    if (this.writer) {
      this.writer.end();
    }
    this.currentFile = path.join(wavFilePath, `grocery-${utteranceId}.wav`);
    this.writer = new wav.FileWriter(this.currentFile, {
      channels: 1,
      sampleRate: this.sampleRate,
      bitDepth: 16
    });
    this.utteranceId = utteranceId;
  }

  write(chunk) {
    if (this.writer) {
      this.writer.write(chunk);
    }
  }

  stop(utteranceId) {
    if (this.writer && this.utteranceId === utteranceId) {
      logger.debug(`Wrote ${this.currentFile}`);
      this.writer.end();
      this.writer = null;
    }
  }

  forceStop() {
    this.stop(this.utteranceId);
  }
}

const processData = (websocket, wavWriter) => {
  const send = (obj) => {
    try {
      if (shouldEnforceSchema) {
        schema.assert(obj);
      }
      websocket.send(JSON.stringify(obj));
    } catch (err) {
      if (err.details) {
        return processError(websocket)(err.details);
      }
      processError(websocket)(err);
    }
  };
  return data => {
    if (websocket.readyState !== 1) {
      // client websocket is not writable, ignore result
      return;
    }
    if (data.started !== undefined) {
      // slu api returns an utterance id
      send({ event: "started", data: data.started });
      wavWriter.start(data.started.utteranceId);
    } else if (data.finished !== undefined) {
      send({ event: "stopped", data: data.finished });
      wavWriter.stop(data.finished.utteranceId);
    } else {
      const productSegments = parseProductSegments(data.utterance);
      if (websocket.readyState === 1 && !R.isEmpty(productSegments)) {
        send({
          event: "transcription",
          data: { utteranceId: data.utterance.utteranceId, type: data.utterance.type, segments: productSegments }
        });
      }
    }
  };
};

const handler = (ws, token, params) => {
  const sampleRateHertz = params.sampleRate ? parseInt(params.sampleRate) : 48000;
  const languageCode = params.languageCode || "fi-FI";
  const wavWriter = isWavRecorderEnabled ? new WavWriter(sampleRateHertz) : new NullWavWriter();

  const config = {
    channels: 1,
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
  recognizer.on("data", processData(ws, wavWriter));

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
      wavWriter.write(message);
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
    client.close();
    wavWriter.forceStop();
  });
};

const kParams = Symbol("session");
const kToken = Symbol("token");
const kError = Symbol("error");

const createToken = deviceId => {
  const client = new SgGrpc.speechgrinder.sgapi.v1.Identity(sgApiUrl, creds);
  return new Promise((resolve, reject) => {
    client.login({ deviceId, appId }, (err, response) => {
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

  const params = queryString.parse(queryStr);
  const findDeviceId = () => {
    if (params.deviceId !== undefined) {
      return params.deviceId;
    } else {
      if (info.req.headers["user-agent"] === undefined) {
        info.req[kError] = JSON.stringify({
          event: "error",
          data: {
            error: errors["S02"],
            code: "S02"
          }
        });
      } else {
        return crypto
          .createHash("md5")
          .update(info.req.headers["user-agent"])
          .digest("hex");
      }
    }
  };

  info.req[kParams] = params;
  return Promise.resolve()
    .then(() => {
      // TODO: find token from cookie or local storage
      const token = info.req.headers.jwt;
      if (token === undefined) {
        return createToken(findDeviceId());
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
httpApp.use(express.static(path.join(__dirname, "www")));

httpApp.get("/ping", function(req, res) {
  return res.send("pong");
});

httpApp.get("/", function(req, res) {
  res.sendFile(path.join(__dirname, "www", "index.html"));
});

const httpServer = http.createServer(httpApp);
bindWebSocket(httpServer);

const port = process.env.PORT || 8080;
httpServer.listen(port, () => {
  logger.info(`HTTP Server listening on port: ${port}`);
});
