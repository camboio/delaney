const discord = require("discord.io");
const scrape = require("scrape-twitter");

const mastodon = require('./mastodon');
const files = require('./files');
const markov = require('./markov');

const config = require("./config.json");

let strings = [];

const compareIds = (x, y) => {
  if (x.length !== y.length) {
    return (x.length > y.length);
  }

  let sliceX = parseInt(x.slice(0, 10));
  let sliceY = parseInt(y.slice(0, 10));

  return (sliceX > sliceY);
};

const scrapeTimeline = async () => {
  console.log('scraping timeline');
  let readTo = await files.readLatest();

  const timeline = new scrape.TimelineStream("brigidwd", {
    retweets: false,
    replies: false,
    count: strings.length > 0 ? 500 : 5000
  });

  timeline.on("data", async chunk => {
    if (compareIds(chunk.id, readTo)) {
      console.log('found newer tweet', chunk.id);

      readTo = chunk.id;
      strings.push(chunk.text);
      await files.writeLatest(chunk.id);
    }
  });

  timeline.on("end", async () => {
    console.log('timeline scraped');
    strings = await files.cleanStrings(strings);
    await files.writeStrings(strings);
  });
};

const bot = new discord.Client({ token: config.discordToken, autorun: true });

bot.on("ready", async e => {
  console.log('ready event fired');
  bot.editUserInfo({ username: "delaney" });
  strings = await files.readStrings();
  markov.buildCorpus(strings);
});

bot.on("message", async (user, uId, to, message, e) => {
  const del = /^<:delaney:\d{18}>$/;
  const hey = /!delaney/;
  
  if (del.test(message) || hey.test(message)) {
    const result = await markov.generateMarkov();
    console.log('generated markov result:', result);

    if(result.error){
      bot.sendMessage({ to, message: result.error });
      return;
    }
    
    bot.sendMessage({ to, message: result.string });
    mastodon.postToot(result.string);
  }
});

setInterval(async () => {
  await scrapeTimeline();
  markov.buildCorpus(strings);
}, 4 * (1000 * 60 * 60));