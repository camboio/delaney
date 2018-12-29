const discord = require("discord.io");
const scrape = require("scrape-twitter");
const Markov = require("markov-strings").default;
const fs = require("fs");
const _ = require("lodash");
const mastodon = require('./mastodon');

const config = require("./config.json");

let strings = [];
let latest = "000000000000";

let latestPosted = {};

let markov;
let corpusBuilt = false;

const compareIds = (x, y) => {
  if (x.length > y.length) {
    return true;
  }

  if (x.length < y.length) {
    return false;
  }

  const xHead = x.slice(0, 6);
  const yHead = y.slice(0, 6);

  if (parseInt(xHead) > parseInt(yHead)) {
    return true;
  }

  if (parseInt(xHead) < parseInt(yHead)) {
    return false;
  }

  if (parseInt(xHead) == parseInt(yHead)) {
    const xMid = x.slice(6, 6);
    const yMid = y.slice(6, 6);

    if (parseInt(xMid) > parseInt(yMid)) {
      return true;
    }

    if (parseInt(xMid) < parseInt(yMid)) {
      return false;
    }
  }

  return false;
};

const readStrings = async () => {
  fs.readFile(__dirname + "/strings.json", (err, data) => {
    if (err) {
      console.log(err);
      scrapeTimeline(data => {
        console.log("scrape complete");
        setupMarkov();
      });
      return;
    }

    if (data) {
      strings = JSON.parse(data);
      strings = cleanStrings(strings);
      writeStrings(strings);
      setupMarkov();
      console.log("strings loaded from file");
    } else {
      strings = [];
      scrapeTimeline(() => setupMarkov());
    }
  });
};

const writeStrings = strings => {
  console.log("writing strings");
  fs.writeFile(
    __dirname + "/strings.json",
    JSON.stringify(strings),
    (err, data) => {
      if (err) {
        console.log(err);
        return;
      }

      if (data) {
        console.log("strings written to file");
      }
    }
  );
};

const cleanStrings = strings => {
  console.log("cleaning strings");
  let tempStrings = strings.map(string => {
    const reg = /^https?:\/\/.*$/;
    let split = string.split(" ");
    split = split.map(word => {
      return reg.test(word) ? null : word;
    });
    split = _.compact(split);
    const join = split.join(" ");
    return join;
  });

  tempStrings = _.compact(tempStrings);
  return tempStrings;
};

const readLatest = async () => {
  fs.readFile(__dirname + "/latest.json", (err, data) => {
    if (err) {
      console.log(err);
      return;
    }

    if (data) {
      try{
        latest = JSON.parse(data);
        console.log("latest tweet loaded from file");
      }
      catch(e) {
        return;
      }
    }
  });
};

const writeLatest = latest => {
  console.log("writing latest", latest);
  fs.writeFile(
    __dirname + "/latest.json",
    JSON.stringify(latest),
    (err, data) => {
      if (err) {
        console.log(err);
        return;
      }

      if (data) {
        latest = data;
        console.log("latest tweet written to file");
      }
    }
  );
};

const scrapeTimeline = callback => {
  const readTo = latest;

  const timeline = new scrape.TimelineStream("brigidwd", {
    retweets: false,
    replies: false,
    count: strings.length > 0 ? 500 : 5000
  });

  timeline.on("data", chunk => {
    if (compareIds(chunk.id, readTo)) {
      console.log("timeline data", chunk.id, chunk.text);
      strings.push(chunk.text);
      if (compareIds(chunk.id, latest)) {
        latest = chunk.id;
      }
    }
  });
  timeline.on("end", () => {
    strings = cleanStrings(strings);
    writeStrings(strings);
    writeLatest(latest);
    callback();
  });
};

const setupMarkov = () => {
  markov = new Markov(strings, { stateSize: 2 });
  console.log("building corpus");
  markov.buildCorpus();
  corpusBuilt = true;
  console.log("corpus built");
  return true;
};

const generateMarkov = callback => {
  if (!corpusBuilt) {
    callback("no corpus to generate markov from");
    setupMarkov();
    return;
  }

  console.log("generating markov", strings.length);

  const options = {
    maxTries: 3000,
    filter: result => {
      return result.string.split(' ').length >= 7 &&
        result.string.length <= 500 &&
        result.score > 30 &&
        !/https?:/.test(result.string) &&
        result.refs.length > 1;
    }
  }

  try { 
    const result = markov.generate(options)
    callback(result);
  }
  catch (e) {
    callback({string: 'There was a problem generating a Markov, sorry.', error: true});
  }
};

const bot = new discord.Client({ token: config.discordToken, autorun: true });

bot.on("ready", async e => {
  console.log("logged in as", bot.username);
  bot.editUserInfo({ username: "delaney" });
  await readStrings();
  await readLatest();
});

bot.on("message", (user, uId, cId, message, e) => {
  const del = /^<:delaney:\d{18}>$/;
  const hey = /!delaney/;

  const postMarkov = markov => {
    console.log(markov);
    latestPosted[cId] = markov;
    bot.sendMessage({ to: cId, message: markov.string });
    if(!markov.error) mastodon.postToot(markov.string);
  };

  if (del.test(message) || hey.test(message)) {
    generateMarkov(result => postMarkov(result));
    return;
  }
});

setInterval(() => {
  scrapeTimeline(() => setupMarkov());
}, 6 * (1000 * 60 * 60));

// scrapeTimeline(() => setupMarkov());