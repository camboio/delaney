# delaneybot

This bot scrapes **@brigidwd** on twitter, then generates markov chains based on them. It connects to discord servers, and can also post toots to Mastodon accounts.

## Setup
You'll need to add a `config.json` file to your root directory, with the following schema:
```js
{

"discordToken":"your discord token here",

"mastodonToken": "your mastodon token here"

}
```

## Run
You'll need to have both `docker` and `yarn` installed. To build the docker image, run the following command:
```
yarn build
```
To test that the build works, you can run the image in attached mode with this command:
```
sudo docker run delaneybot
```
Once you're ready for it to run in detached mode, simply:
```
yarn start
```

Enjoy!