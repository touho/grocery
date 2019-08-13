const R = require("ramda");
const protoLoader = require("@grpc/proto-loader");
const grpc = require("grpc");
const progressBar = require("progress");

const appId = process.env.APP_ID;

if (appId === undefined) {
  throw new Error("APP_ID environment variable needs to be set");
}

const SgGrpc = grpc.loadPackageDefinition(
  protoLoader.loadSync("../sg.proto", {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true
  })
);

const getLanguageCode = language => {
  if (language === "FI") {
    return "fi-FI";
  }
  if (language === "EN") {
    return "en-US";
  }
  throw new Error(`Only languages 'FI' and 'EN' currently supported! Got ${language}`);
};

const createSGApiCall = (wlu, authToken) => (text, accum, language) => {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.add("Authorization", `Bearer ${authToken}`);
    wlu.parse({ text: text, languageCode: getLanguageCode(language) }, metadata, (err, response) => {
      if (err) {
        return reject(err);
      }
      accum.push(response.tokens);
      resolve(accum);
    });
  });
};

const analyse = (texts, apiCall, language, bar) => {
  return new Promise((resolve, reject) => {
    texts
      .reduce((previousPromise, text) => {
        return previousPromise.then(accum => {
          bar.tick();
          return apiCall(text, accum, language);
        });
      }, Promise.resolve([]))
      .then(t => {
        resolve(t);
      })
      .catch(err => {
        console.log(` Skipping data index creation for language ${language}! (not supported by give application ID)`);
        texts.forEach(t => bar.tick());
        reject(err);
      });
  });
};

const coef = x => {
  // negative slope sigmoid
  const alpha = 1.0;
  const beta = 4.0;
  return 1.0 / (1.0 + Math.exp((x - beta) / alpha));
};

const getTokenScores = lemmas => {
  const nameTokens = lemmas
    .map((token, i) => ({ token: token, i: i }))
    .filter(x => x.token !== "")
    .map(x => ({ tokens: x.token.split("#"), i: x.i }))
    .flatMap(y => {
      return y.tokens.map(x => {
        return y.tokens.length > 1
          ? {
              token: x,
              weight: 1.0 / y.tokens.length,
              index: y.i,
              ofTotalTokens: y.tokens.length,
              coefficient: coef(y.i)
            }
          : {
              token: x,
              weight: 1.0,
              index: y.i,
              ofTotalTokens: y.tokens.length,
              coefficient: coef(y.i)
            };
      });
    });
  const byToken = R.groupBy(x => x.token);
  return byToken(nameTokens);
};

const groupIndexByToken = R.pipe(
  R.groupBy(entry => entry.token),
  entry => R.map(tokens => tokens.map(x => x.i), entry)
);

const getLemmas = (nluForNames, language) => {
  if (language === "EN") {
    return nluForNames.map(tokens => {
      return tokens
        .filter(token => (token.pos !== "PUNCT" && token.pos !== "SYM") || token.text === "," || token.text === "/")
        .map(token => token.lemma)
        .join(" ")
        .split(/[\/|,]/)
        .map(t => t.trim().replace(/\s/g, "#"));
    });
  } else {
    return nluForNames.map(tokens => tokens.map(token => token.lemma));
  }
};

const makeIndex = (data, apiCall, language, bar) => {
  return new Promise((resolve, reject) => {
    const names = data.map(entry => entry.name);
    analyse(names, apiCall, language, bar)
      .then(nluForNames => {
        const allTitleLemmas = getLemmas(nluForNames, language);
        const dataWithScores = data.map((entry, i) => {
          return Object.assign({}, entry, { tokenScores: getTokenScores(allTitleLemmas[i]) });
        });
        const invertedIndex = groupIndexByToken(
          allTitleLemmas.flatMap((titleLemmas, i) => {
            return titleLemmas
              .filter(x => x !== "")
              .flatMap(word => {
                return word.split("#").map(token => ({ i, token }));
              });
          })
        );
        resolve({ index: dataWithScores, invertedIndex });
      })
      .catch(err => {
        resolve({ index: undefined, invertedIndex: undefined });
      });
  });
};

const login = () => {
  return new Promise((resolve, reject) => {
    let sgApiUrl;
    let creds;
    if (process.env.SG_API_URL) {
      sgApiUrl = process.env.SG_API_URL;
      creds = grpc.credentials.createInsecure();
    } else {
      sgApiUrl = "api.speechgrinder.com";
      creds = grpc.credentials.createSsl();
    }
    const identity = new SgGrpc.speechgrinder.sgapi.v1.Identity(sgApiUrl, creds);
    const wlu = new SgGrpc.speechgrinder.sgapi.v1.Wlu(sgApiUrl, creds);
    const deviceId = "fineli-lemmatizer";
    identity.login({ appId, deviceId }, (err, response) => {
      if (err) {
        return reject(err);
      }
      resolve(createSGApiCall(wlu, response.token));
    });
  });
};

const makeIndexForAllLanguages = (data, sgApiCall, bar) => {
  return Promise.all([makeIndex(data.en, sgApiCall, "EN", bar), makeIndex(data.fi, sgApiCall, "FI", bar)]);
};

const scoreData = data => {
  return new Promise((resolve, reject) => {
    const bar = new progressBar(`   Lemmatizing :bar :percent`, {
      width: 20,
      total: data.en.length + data.fi.length
    });

    Promise.resolve(login())
      .then(sgApiCall => makeIndexForAllLanguages(data, sgApiCall, bar))
      .then(indicies => resolve(indicies))
      .catch(err => reject(err));
  });
};

module.exports = { scoreData };
