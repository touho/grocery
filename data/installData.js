const fs = require("fs");
const fineli = require("./preprocessFineli");
const score = require("./tokenScores");

const isJsonString = str => {
  try {
    JSON.parse(str);
  } catch (e) {
    return false;
  }
  return true;
};

const getData = (dataPath, language) => {
  if (language.toLowerCase() !== "fi" && language.toLowerCase() !== "en") {
    throw new Error(`Only languages 'FI' and 'EN' currently supported! Got ${language}`);
  }
  console.log(`   Processing data from ${dataPath}...`);
  return new Promise((resolve, reject) => {
    fs.readFile(dataPath, { encoding: "utf-8" }, function(err, content) {
      if (err) {
        return reject(err);
      }
      const data = {
        [language]: content
          .toString("utf8")
          .split("\n")
          .filter(isJsonString)
          .map(JSON.parse)
      };
      resolve({ data, coef: dataPath.startsWith("fineli") ? fineli.coef : x => 1.0 });
    });
  });
};

console.log(`Installing data indices:`);
Promise.resolve(process.argv.length === 4 ? getData(process.argv[2], process.argv[3]) : fineli.getFineli())
  .then(input => score.scoreData(input.data, input.coef))
  .then(data => {
    fs.writeFileSync("invertedIndex.json", JSON.stringify(data.invertedIndex), "utf8");
    fs.writeFileSync("data.json", JSON.stringify(data.index), "utf8");
    console.log(`Installing data indices done.`);
  })
  .catch(err => {
    console.error(err);
  });
