var discord = require('discord.io');
var scrape = require('scrape-twitter');
var Markov = require('markov-strings');
var fs = require('fs');
var _ = require('lodash');

var config = require('./config.json');

var strings = [];
var latest = '000000000000';

var markov;
var corpusBuilt = false;

const compareIds = (x, y) => {
   if(x.length > y.length){
      return true;
   }

   if(x.length < y.length){
      return false;
   }

   var xHead = x.slice(0,6);
   var yHead = y.slice(0,6);

   if(parseInt(xHead) > parseInt(yHead)){
      return true;
   }

   if(parseInt(xHead) < parseInt(yHead)){
      return false;
   }

   if(parseInt(xHead) == parseInt(yHead)){
      var xMid = x.slice(6,6);
      var yMid = y.slice(6,6);

      if(parseInt(xMid) > parseInt(yMid)){
         return true;
      }
   
      if(parseInt(xMid) < parseInt(yMid)){
         return false;
      }
   }

   return false;
}

const readStrings = async () => {
   fs.readFile(__dirname + '/strings.json', (err, data) => {
      if(err) {
         console.log(err);
         scrapeTimeline((data) => {
            console.log('scrape complete');
            setupMarkov();
         });
         return;
      }

      if(data){
         strings = JSON.parse(data);
         strings = cleanStrings(strings);
         writeStrings(strings);
         setupMarkov();
         console.log('strings loaded from file');
         return;
      }
   })
};

const writeStrings = (strings) => {
   console.log('writing strings');
   fs.writeFile(__dirname + '/strings.json', JSON.stringify(strings), (err, data) => {
      if(err) {
         console.log(err);
         return;
      }

      if(data){
         console.log('strings written to file');
      }
   })
};

const cleanStrings = (strings) => {
   console.log('cleaning strings');
   var tempStrings = strings.map(string => {
      var reg = /^https?:\/\/.*$/;
      var split = string.split(" ");
      split = split.map(word => {
         return reg.test(word) ? null : word;
      });
      split = _.compact(split);
      var join = split.join(" ");
      return join;
   });

   tempStrings = _.compact(tempStrings);
   return tempStrings;
}

const readLatest = async () => {
   fs.readFile(__dirname + '/latest.json', (err, data) => {
      if(err) {
         console.log(err);
         return;
      }

      if(data){
         latest = JSON.parse(data);
         console.log('latest tweet loaded from file');
         return;
      }
   });
}

const writeLatest = (latest) => {
   console.log('writing latest', latest);
   fs.writeFile(__dirname + '/latest.json', JSON.stringify(latest), (err, data) => {
      if(err) {
         console.log(err);
         return;
      }

      if(data){
         latest = data;
         console.log('latest tweet written to file');
      }
   });
}

const scrapeTimeline = (callback) => {
   var readTo = latest;

   var timeline = new scrape.TimelineStream('brigidwd', {
      retweets: false,
      replies: false,
      count: strings.length > 0 ? 50 : 5000
   });

   timeline.on('data', (chunk) => {
      if(compareIds(chunk.id, readTo)){
         console.log('timeline data', chunk.id, chunk.text);
         strings.push(chunk.text);
         if(compareIds(chunk.id, latest)){
            latest = chunk.id;
         }
      }
   });
   timeline.on('end', () => {
      strings = cleanStrings(strings);
      writeStrings(strings);
      writeLatest(latest);
      callback();
   });
}

const setupMarkov = () => {
   var opts = {
      maxLength: 200,
      minWords: 10,
      minScore: 30
   };

   console.log('setting up markov');
   markov = new Markov(strings, opts);
   console.log('building corpus');
   markov.buildCorpus()
   .then(() => {
      corpusBuilt = true;
      console.log('corpus built');
      return true;
   });
}

const generateMarkov = (callback) => {
   if(!corpusBuilt){ callback('no corpus to generate markov from'); 
   setupMarkov();
   return;}

   markov.generateSentence()
   .then(result => callback(result));
}

// var bot = new discord.Client({
//    token: config.token,
//    autorun: true
// });

// bot.on('ready', async e => {
//    console.log('logged in as', bot.username);
//    bot.editUserInfo({username: 'delaney'});
//    await readStrings();
//    await readLatest();
// });

// bot.on('message', (user, uId, cId, message, e) => {
//    var reg = /^<@(\d{18})> !(\w*).*$/;
//    var del = /^<:delaney:\d{18}>$/;

//    if(del.test(message)){
//       generateMarkov(result => {
//          console.log(result);
//          bot.sendMessage({
//             to: cId,
//             message: result.string
//          });
//       });
//       return;
//    }
   
//    if(reg.test(message)){
//       var match = reg.exec(message);
//       if(match[1] == bot.id){
//          var cmd = match[2];

//          switch(cmd){
//             case 'scrape':
//                bot.sendMessage({
//                   to: cId,
//                   message: 'Scraping (the bottom of the barrel)'
//                });
//                scrapeTimeline(() => {
//                   setupMarkov();
//                   bot.sendMessage({
//                      to: cId,
//                      message: 'Scraping complete'
//                   });
//                });
//                break;
//             case 'tweet':
//                generateMarkov(result => {
//                   console.log(result);
//                   bot.sendMessage({
//                      to: cId,
//                      message: result.string
//                   });
//                });
//                break;
//             default:
//                console.log('some other request');
//          }
//       }
//    }
// });

scrapeTimeline(() => console.log('done'));
