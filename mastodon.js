const mastodon = require('mastodon');
const config = require('./config.json');

const m = new mastodon({
  access_token: config.mastodonToken,
  timeout_ms: 60 * 1000,
  api_url: 'https://auspol.cafe/api/v1/'
})

const postToot = async status => {
  if(!status) return;

  const options = {
    status
  }

  return await m.post('statuses', options);
}

module.exports = {
  postToot
}