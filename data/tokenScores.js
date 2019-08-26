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

const parse = (wlu, authToken, text, languageCode) => {
  return new Promise((resolve, reject) => {
    const metadata = new grpc.Metadata();
    metadata.add("Authorization", `Bearer ${authToken}`);
    wlu.parse({ text: text, languageCode: languageCode }, metadata, (err, response) => {
      if (err) {
        return reject(err);
      }
      resolve(response.tokens);
    });
  });
};

const createSGApiCall = (wlu, authToken) => (entry, accum, language) => {
  const synonymIndex = 1 + entry.tags.length;
  const names = [entry.name].concat(entry.tags).concat(entry.synonyms);
  return Promise.all(names.map(name => parse(wlu, authToken, name, getLanguageCode(language)))).then(parses => {
    accum.push({
      name: parses[0].concat(parses.slice(synonymIndex).flatMap(x => x)),
      tags: parses.slice(1, synonymIndex)
    });
    return accum;
  });
};

const analyse = (entries, apiCall, language, bar) => {
  return entries.reduce((previousPromise, entry) => {
    return previousPromise.then(accum => {
      bar.tick();
      return apiCall(entry, accum, language);
    });
  }, Promise.resolve([]));
};

const weightTokens = (lemmas, startIndex, coef) => {
  return lemmas
    .map((token, i) => ({ token: token, i: i + startIndex }))
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
};

const getTokenScores = (nameLemmas, tagLemmas, coef) => {
  const nameTokens = weightTokens(nameLemmas, 0, coef);
  const finalNameTokenIndex = nameTokens.map(x => x.index).reduce((x, y) => Math.max(x, y), 0);
  const tagTokens = weightTokens(tagLemmas, finalNameTokenIndex, x => 0.9 * coef(x));
  const byToken = R.groupBy(x => x.token);
  return byToken(nameTokens.concat(tagTokens));
};

const groupIndexByToken = R.pipe(
  R.groupBy(entry => entry.token),
  entry => R.map(tokens => tokens.map(x => x.i), entry)
);

const getTags = (nluForTags, score) => {
  return nluForTags
    .map(tags => tags.map(token => ({ l: token.lemma, n: token.lemma.split(/#| /).length })))
    .reduce((obj, tags) => {
      obj[tags.map(x => x.l).join(" ")] = score * tags.map(x => x.n).reduce((x, y) => x + y, 0);
      return obj;
    }, {});
};

const assignIndices = (lemmas, i) => {
  return lemmas
    .filter(x => x !== "")
    .flatMap(word => {
      return word.split("#").map(token => ({ i, token }));
    });
};

const makeIndex = (data, apiCall, language, bar, coef, getLemmas, format, expand) => {
  const entries = data.map(entry => {
    return {
      name: format(entry.name),
      tags: (entry.tags || []).map(tag => format(tag)),
      synonyms: expand(entry.name)
    };
  });
  return analyse(entries, apiCall, language, bar).then(nluForEntries => {
    const nluForNames = nluForEntries.map(entry => entry.name);
    const nluForTags = nluForEntries.map(entry => entry.tags);
    const nameLemmaTokens = getLemmas(nluForNames, language);
    const tagLemmaTokens = nluForTags.map(tags => tags.flatMap(tokens => tokens.map(token => token.lemma)));

    const dataWithScores = data.map((entry, i) => {
      return Object.assign({}, entry, {
        tokenScores: getTokenScores(nameLemmaTokens[i], tagLemmaTokens[i], coef),
        tags: getTags(nluForTags[i], 1.1)
      });
    });
    const nameTokenIndices = nameLemmaTokens.flatMap(assignIndices);
    const tagTokenIndices = tagLemmaTokens.flatMap(assignIndices);
    const invertedIndex = groupIndexByToken(nameTokenIndices.concat(tagTokenIndices));
    return { index: dataWithScores, invertedIndex };
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

const makeIndexForAllLanguages = (data, sgApiCall, bar, coef, getLemmas, format, expand) => {
  return Promise.all(
    Object.keys(data).map(language =>
      makeIndex(data[language], sgApiCall, language.toUpperCase(), bar, coef, getLemmas, format, expand).catch(err => {
        console.log(err);
        console.log(` Skipping data index creation for language ${language}! (not supported by given application ID)`);
        data[language].forEach(t => bar.tick());
      })
    )
  );
};

const replaceWith = replacements => name => {
  return replacements.reduce((x, y) => x.replace(new RegExp(y[0], "g"), y[1]), name.toLowerCase());
};

const expandWith = synonyms => name => {
  const tokens = name.toLowerCase().split(" ");
  return (tokensToAppend = Object.keys(synonyms)
    .filter(synonym => R.contains(synonym, tokens))
    .flatMap(synonym => synonyms[synonym]));
};

const scoreData = (
  data,
  coef = () => 1.0,
  getLemmas = x => x.map(tokens => tokens.map(token => token.lemma)),
  replacements = [],
  synonyms = {}
) => {
  const languages = Object.keys(data);
  const bar = new progressBar(`   Lemmatizing :bar :percent`, {
    width: 20,
    total: languages.map(language => data[language].length).reduce((x, y) => x + y, 0)
  });
  return login()
    .then(sgApiCall =>
      makeIndexForAllLanguages(data, sgApiCall, bar, coef, getLemmas, replaceWith(replacements), expandWith(synonyms))
    )
    .then(indicies => {
      const invertedIndex = {};
      const index = {};
      languages
        .map((language, i) => ({ language: language, data: indicies[i] }))
        .filter(language => language.data)
        .forEach(language => {
          invertedIndex[language.language] = language.data.invertedIndex;
          index[language.language] = language.data.index;
        });
      return { index, invertedIndex };
    });
};

module.exports = { scoreData };
