const Markov = require("markov-strings").default;

let corpus;

const generateMarkov = () => {
  console.log('generating markov');
  
  if (!corpus) {
    return { error: 'no corpus. unable to generate markov'}
  }

  const options = {
    maxTries: 3000,
    filter: result => {
      return result.string.split(' ').length >= 7 &&
        result.string.length <= 350 &&
        result.score > 30 &&
        !/https?:/.test(result.string) &&
        result.refs.length > 1;
    }
  }

  try { 
    return corpus.generate(options);
  }
  catch (e) {
    return { error: 'Unable to generate a markov with given options' };
  }
};

const buildCorpus = strings => {
  console.log('building corpus');
  corpus = new Markov(strings, { stateSize: 2 });
  corpus.buildCorpus();
};

module.exports = {
  generateMarkov,
  buildCorpus
}