const R = require("ramda");
const fs = require("fs");
const uuidv4 = require("uuid/v4");

const logger = console;

const invertedIndex = JSON.parse(fs.readFileSync("data/invertedIndex.json"));
const dataIndex = JSON.parse(fs.readFileSync("data/data.json").toString("utf8"));

const getProductCandidateIndices = (compounds, lang) => {
  if (!invertedIndex.hasOwnProperty(lang)) {
    logger.error(`Invalid lang '${lang}' in product search`);
    return { maxHit: 0, entries: [] };
  }
  const indexEntries = {};
  for (const compound of compounds) {
    if (compound in invertedIndex[lang]) {
      for (const index of invertedIndex[lang][compound]) {
        indexEntries[index] = [compound].concat(indexEntries[index] || []);
      }
    }
  }
  const entries = Object.keys(indexEntries).map(index => {
    return {
      index: index,
      count: indexEntries[index].filter((v, j, a) => a.indexOf(v) === j).length
    };
  });

  const maxCount = entries.map(x => x.count).reduce((x, y) => Math.max(x, y), 0);
  return {
    maxHit: maxCount,
    entries: entries.filter(index => index.count === maxCount).map(index => index.index)
  };
};

const convertAmount = (dataEntry, amount, unit) => {
  let coefficient = dataEntry.unitConversions[unit];
  return coefficient
    ? dataEntry.unitName === "kpl" || dataEntry.unitName === "pcs"
      ? Math.ceil(amount * coefficient)
      : Number((amount * coefficient).toPrecision(3))
    : undefined;
};

const scoreTokenHits = tokenHits => {
  const byIndex = R.groupBy(x => x.index);
  const scores = R.map(x => {
    const weightSum = x.map(y => y.weight).reduce((x, y) => x + y, 0.0);
    const score = weightSum === 1.0 ? x[0].ofTotalTokens : weightSum;
    return score * x[0].coefficient;
  }, byIndex(tokenHits));
  return Object.values(scores).reduce((x, y) => x + y, 0.0);
};

const documentCompoundScore = (compounds, tokenScores) => {
  const tokenHits = compounds
    .map(x => tokenScores[x])
    .filter(x => x)
    .map(x => x[0]);
  return scoreTokenHits(tokenHits);
};

const byProductSortAttributes = (a, b) => {
  if (a.score === b.score) {
    if ((a.amount === undefined && b.amount === undefined) || (a.amount !== undefined && b.amount !== undefined)) {
      if (b.popularity === a.popularity) {
        return a.name.length - b.name.length;
      } else {
        return b.popularity - a.popularity;
      }
    } else {
      if (a.amount === undefined && b.amount !== undefined) {
        return 1;
      } else {
        return -1;
      }
    }
  } else {
    return b.score - a.score;
  }
};

const assignAndScoreCandidates = utterance => {
  const candidates = utterance.candidates;
  const query = utterance.normalizedQuery;
  const compounds = utterance.compounds;
  const amount = utterance.amount;
  const unit = utterance.unit;
  const maxProducts = utterance.maxProducts;
  const lang = utterance.lang;

  return candidates.entries
    .map(entryIndex => dataIndex[lang][entryIndex])
    .map(entry =>
      Object.assign({}, entry, {
        displayText: entry.name,
        amount: unit ? convertAmount(entry, amount, unit) : amount,
        score: entry.tags[query] || documentCompoundScore(compounds, entry.tokenScores),
        unitConversions: entry.unitConversions,
        tokenScores: entry.tokenScores
      })
    )
    .sort(byProductSortAttributes)
    .map(entry => {
      entry.amount = entry.amount || 1;
      return entry;
    })
    .map(entry => {
      entry.tags = undefined;
      return entry;
    })
    .slice(0, maxProducts);
};

const queryProducts = queryData => {
  const candidates = getProductCandidateIndices(queryData.compounds, queryData.lang);
  const products = assignAndScoreCandidates(Object.assign({}, queryData, { candidates: candidates }));
  const scoreFor = attribute => (attribute ? 1.0 : 0.0);
  const score =
    products.length > 0
      ? products[0].score +
        scoreFor(queryData.hasUnit) +
        scoreFor(queryData.hasAmount) +
        2 * scoreFor(queryData.hasTime)
      : 0.0;

  return {
    transcript: queryData.transcript,
    query: queryData.query,
    normalizedQuery: queryData.normalizedQuery,
    products: products,
    queryId: uuidv4(),
    score: score
  };
};

module.exports = { queryProducts };
