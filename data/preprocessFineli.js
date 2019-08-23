const fs = require("fs");
const os = require("os");
const path = require("path");

const https = require("https");
const streamZip = require("node-stream-zip");
const csv = require("csvtojson");
const iconv = require("iconv-lite");
const R = require("ramda");

const url = "https://fineli.fi/fineli/content/file/47/Fineli_Rel20";

const sizeEstimates = (definedPortions, language) => {
  if (language === "FI") {
    return {
      "pieni annos": definedPortions["pieni annos"] || definedPortions["pieni (kpl)"] || 15,
      "keskikokoinen annos": definedPortions["keskikokoinen annos"] || definedPortions["keskikokoinen (kpl)"] || 30,
      "iso annos": definedPortions["iso annos"] || definedPortions["iso (kpl)"] || 45,
      "pieni (kpl)": definedPortions["pieni (kpl)"] || definedPortions["pieni annos"] || 15,
      "keskikokoinen (kpl)": definedPortions["keskikokoinen (kpl)"] || definedPortions["keskikokoinen annos"] || 30,
      "iso (kpl)": definedPortions["iso (kpl)"] || definedPortions["iso annos"] || 45,
      desilitra: definedPortions["desilitra"] || 100,
      ruokalusikka: definedPortions["ruokalusikka"] || 15,
      teelusikka: definedPortions["teelusikka"] || 5,
      gramma: 1,
      default: definedPortions["keskikokoinen annos"] || definedPortions["keskikokoinen (kpl)"] || 30
    };
  } else if (language === "EN") {
    return {
      "small portion": definedPortions["small portion"] || definedPortions["small piece"] || 15,
      "medium-sized portion": definedPortions["medium-sized portion"] || definedPortions["medium-sized piece"] || 30,
      "big portion": definedPortions["big portion"] || definedPortions["big piece"] || 45,
      "small piece": definedPortions["small piece"] || definedPortions["small portion"] || 15,
      "medium-sized piece": definedPortions["medium-sized piece"] || definedPortions["medium-sized portion"] || 30,
      "big piece": definedPortions["big piece"] || definedPortions["big portion"] || 45,
      decilitre: definedPortions["decilitre"] || 100,
      tablespoon: definedPortions["tablespoon"] || 15,
      teaspoon: definedPortions["teaspoon"] || 5,
      gram: 1,
      default: definedPortions["medium-sized portion"] || definedPortions["medium-sized piece"] || 30
    };
  } else {
    throw new Error(`Only languages 'FI' and 'EN' currently supported! Got ${language}`);
  }
};

const downloadFineli = url => {
  console.log(`   Downloading fineli zip from ${url}...`);
  return new Promise((resolve, reject) => {
    https
      .get(url, res => {
        fs.mkdtemp(path.join(os.tmpdir(), "fineli"), (err, tempDir) => {
          if (err) return reject(err);
          const zipFilePath = path.join(tempDir, "Fineli_Rel_19.zip");
          res.pipe(
            fs.createWriteStream(zipFilePath),
            { encoding: "binary" }
          );
          res.on("close", () => resolve(zipFilePath));
        });
      })
      .on("error", err => {
        reject(err);
      });
  });
};

const extractData = (zip, entryName) => {
  return new Promise((resolve, reject) => {
    zip.stream(entryName, function(err, stream) {
      csv({ delimiter: ";" })
        .fromStream(stream.pipe(iconv.decodeStream("ISO-8859-1")))
        .then(data => {
          const entry = {};
          entry[entryName.replace("Fineli_Rel19_open/", "").replace(".csv", "")] = data;
          resolve(entry);
        })
        .catch(error => reject(error));
    });
  });
};

const unzip = zipFilePath => {
  console.log("   Extracting zip...");
  return new Promise((resolve, reject) => {
    const zip = new streamZip({ file: zipFilePath, storeEntries: true });
    zip.on("error", err => reject(err));
    zip.on("ready", () => {
      Promise.all(
        Object.values(zip.entries())
          .filter(entry => entry.name.endsWith(".csv"))
          .map(entry => extractData(zip, entry.name))
      )
        .then(entries => {
          zip.close();
          fs.unlink(zipFilePath, err => {
            if (err) return reject(err);
            resolve(entries.reduce((previous, current) => Object.assign({}, previous, current), {}));
          });
        })
        .catch(err => reject(err));
    });
  });
};

const getNameMap = (names, key, value) => R.fromPairs(names.map(entry => [entry[key], entry[value]]));

const assignData = (assignments, data) => {
  return R.map(entries => {
    return entries.map(entry => {
      return R.map(assignment => assignment(entry), assignments);
    });
  }, data);
};

const assignNutrition = (nutritionUnits, nutritionNames) => nutritions => {
  const unit = getNameMap(nutritionUnits, "EUFDNAME", "COMPUNIT");
  const name = getNameMap(nutritionNames, "THSCODE", "DESCRIPT");
  const assigments = {
    name: entry => name[entry.EUFDNAME],
    unit: entry => unit[entry.EUFDNAME],
    value: entry => parseFloat(entry.BESTLOC.replace(",", "."))
  };

  return assignData(assigments, nutritions);
};

const assignPortions = portionNames => portions => {
  const name = getNameMap(portionNames, "THSCODE", "DESCRIPT");
  const assigments = {
    name: entry => name[entry.FOODUNIT],
    value: entry => parseFloat(entry.MASS.replace(",", ".")),
    unit: entry => "G"
  };
  return assignData(assigments, portions);
};

const assignDiet = dietNames => diets => {
  const description = getNameMap(dietNames, "THSCODE", "DESCRIPT");
  const assigments = {
    name: entry => entry.SPECDIET,
    description: entry => description[entry.SPECDIET]
  };
  return assignData(assigments, diets);
};

const groupByAndAssign = assignment =>
  R.pipe(
    R.groupBy(entry => entry.FOODID),
    assignment
  );

const getUnitConversion = language => portionDefs => {
  const portionsFineli = JSON.parse(fs.readFileSync(`portionsFineli_${language}.json`));

  const definedPortions = getNameMap(portionDefs, "name", "value");
  const portions = sizeEstimates(definedPortions, language);
  const portionsTypes = portionsFineli.portiontypes;
  const portionTypeAttributes = Object.assign({}, portionsFineli.portionTypeAttributes, { "": "" });
  const conversions = portionsFineli.conversion;

  const portionSize = R.toPairs(portionsTypes).flatMap(portionType => {
    return R.toPairs(portionTypeAttributes).map(attribute => {
      const portion = (attribute[1] + " " + portionType[1]).trim();
      const expression = (attribute[0] + " " + portionType[0]).trim();
      const size = conversions[portion].multiplier * portions[conversions[portion].portiontype];
      return { expression: expression, size: size };
    });
  });
  return getNameMap(portionSize, "expression", "size");
};

const transformFineli = (data, language) => {
  const foodNames = `foodname_${language}`;
  const foodNutrition = "component_value";
  const nutritionUnits = "component";
  const nutritionNames = `eufdname_${language}`;
  const portionSizes = "foodaddunit";
  const portionNames = `foodunit_${language}`;
  const dietType = "specdiet";
  const dietTypeNames = `specdiet_${language}`;

  const getNutritionById = groupByAndAssign(assignNutrition(data[nutritionUnits], data[nutritionNames]));
  const getPortionById = groupByAndAssign(assignPortions(data[portionNames]));
  const getDietTypesById = groupByAndAssign(assignDiet(data[dietTypeNames]));

  const foodNameById = getNameMap(data[foodNames], "FOODID", "FOODNAME");
  const nutritionById = getNutritionById(data[foodNutrition]);
  const portionById = getPortionById(data[portionSizes]);
  const dietTypesById = getDietTypesById(data[dietType]);

  const foodNameIDs = Object.keys(foodNameById);

  const unitConversionDefs = getUnitConversion(language);
  return foodNameIDs.map(id => {
    return {
      id: id,
      name: foodNameById[id],
      tags: [],
      popularity: 0.5,
      unitName: "g",
      measureName: "g",
      unitConversions: unitConversionDefs(portionById[id] || []),
      payload: {
        nutritions: nutritionById[id],
        portions: portionById[id],
        diets: dietTypesById[id]
      }
    };
  });
};

const preprocess = data => {
  console.log("   Processing data...");
  return new Promise((resolve, reject) => {
    resolve({
      en: transformFineli(data, "EN"),
      fi: transformFineli(data, "FI")
    });
  });
};

const coef = x => {
  // negative slope sigmoid
  const alpha = 1.0;
  const beta = 4.0;
  return 1.0 / (1.0 + Math.exp((x - beta) / alpha));
};

const getFineli = () => {
  return new Promise((resolve, reject) => {
    Promise.resolve(downloadFineli(url))
      .then(fineli => unzip(fineli))
      .then(fineli => preprocess(fineli))
      .then(fineli => resolve({ data: fineli, coef: coef }))
      .catch(err => reject(err));
  });
};

module.exports = { getFineli, coef };
