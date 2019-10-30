const Joi = require("@hapi/joi");

const tokenScore = Joi.object().keys({
  token: Joi.string(),
  weight: Joi.number(),
  index: Joi.number().integer(),
  ofTotalTokens: Joi.number().integer(),
  coefficient: Joi.number()
});

const product = Joi.object().keys({
  ean: Joi.number().integer(),
  imageUrl: Joi.string().uri(),
  name: Joi.string(),
  unitName: Joi.string(),
  measureName: Joi.string(),
  unitConversions: Joi.object(),
  tags: Joi.object(),
  popularity: Joi.number(),
  category: Joi.string(),
  brand: Joi.string().allow(null),
  tokenScores: Joi.object().pattern(/.*/, Joi.array().items(tokenScore)),
  displayText: Joi.string(),
  amount: Joi.number(),
  score: Joi.number()
});

const segment = Joi.object().keys({
  transcript: Joi.string(),
  query: Joi.string(),
  normalizedQuery: Joi.string(),
  products: Joi.array().items(product),
  queryId: Joi.string(),
  score: Joi.number()
});

const segments = Joi.object().keys({
  utteranceId: Joi.string()
    .uuid()
    .required(),
  type: Joi.string()
    .required()
    .valid("interimItem", "finalItem"),
  segments: Joi.array().items(segment)
});

const utterance = Joi.object().keys({
  utteranceId: Joi.string()
    .uuid()
    .required(),
  error: Joi.string().allow(null)
});

const events = Joi.string()
  .required()
  .valid("started", "stopped", "transcription");

const schema = Joi.object().keys({
  event: events,
  data: Joi.alternatives().try(segments, utterance)
});

module.exports.assert = (obj) => Joi.assert(obj, schema);
