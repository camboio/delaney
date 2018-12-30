const fs = require('fs');
const util = require('util');
const _ = require("lodash");

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

const stringsPath = __dirname + "/strings.json";
const latestPath = __dirname + "/latest.json";

const readStrings = async () => {
  console.log('reading strings');

  try{
    let strings = await readFile(stringsPath)
    strings = JSON.parse(strings);
    strings = cleanStrings(strings);
    return strings;
  } catch (e) {
    return [];
  }
};

const writeStrings = async strings => {
  console.log('writing strings');
  const jsonStrings = JSON.stringify(strings);
  return await writeFile(stringsPath, jsonStrings);
};

const cleanStrings = strings => {
  console.log("cleaning strings");
  let tempStrings = strings.map(string => {
    const reg = /https?:/;
    let split = string.split(" ");
    split = split.map(word => {
      return reg.test(word) ? null : word;
    });
    split = _.compact(split);
    return split.join(" ");
  });

  return _.compact(tempStrings);
};

const readLatest = async () => {
  try{
    const result = await readFile(latestPath);
    return JSON.parse(result);
  } catch (e) {
    return '';
  }
};

const writeLatest = async latest => {
  return await writeFile(latestPath, JSON.stringify(latest));
};

module.exports = {
  readLatest,
  writeLatest,
  readStrings,
  writeStrings,
  cleanStrings
}