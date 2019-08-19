const fs = require("fs");
const fineli = require("./preprocessFineli");

Promise.resolve(fineli.getFineli()).then(fineli => {
  const data = fineli.data;
  Object.keys(data).forEach(language => {
    fs.writeFileSync(
      `fineli_${language}.jsonl`,
      data[language]
        .map(JSON.stringify)
        .join("\n")
        .toString("utf8"),
      "utf8"
    );
  });
});
