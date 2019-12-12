const cheerio = require('cheerio');
const https = require('https');
const Datastore = require('nedb');
const nedb = new Datastore();
const axios = require('axios');
/**
 *
 * @param {JSON} document
 */
const nedbInsert = document => {
  return new Promise((resolve, reject) => {
    nedb.insert(document, (err, doc) => {
      if (err) {
        reject(err);
      }
      resolve(doc);
    });
  });
};

const nedbDelete = slackid => {
  return new Promise((resolve, reject) => {
    nedb.remove({ slackid }, err => {
      if (err) {
        reject(err);
      }
    });
  });
};

/**
 *
 * @param {JSON} query
 */
const nedbFindOne = query => {
  return new Promise((resolve, reject) => {
    nedb.findOne(query, (err, doc) => {
      if (err) {
        reject(err);
      }
      resolve(doc);
    });
  });
};

/**
 * get html of atcoder_user's profile
 * @param {String} user
 */
const getatCoderProfilePromise = user => {
  return new Promise((resolve, reject) => {
    https
      .get(`https://atcoder.jp/users/${user}/`, resp => {
        let data = '';
        resp.on('data', chunk => {
          data += chunk;
        });
        resp.on('end', () => {
          resolve(data);
        });
      })
      .on('error', err => {
        reject(err);
      });
  });
};

/**
 * get token from atcoder_user's affiliation
 * @param {String} user
 */
const getTokenFromAffiliation = async user => {
  const html = await getatCoderProfilePromise(user);
  const $ = cheerio.load(html);
  const atcoderAffiliation = $('td.break-all').text();
  if (atcoderAffiliation) {
    return getTokenInParentheses(atcoderAffiliation);
  }
};

const getTokenInParentheses = (atcoderAffiliation) => {
  try {
    const tokenInParentheses = atcoderAffiliation.match(/\(\w{22}\)/g)[0];
    return tokenInParentheses.split(/\(|\)/)[1];
  } catch {
    return '';
  }
};

const getMaxRating = (atcoderUsername) => {
  return axios.get(`https://atcoder.jp/users/${atcoderUsername}/history/json`)
    .then(res => {
      const history = res.data.map(x => x.NewRating);
      return history.length > 0 ? Math.max(history) : 0;
    }).catch(err => console.log(err));
};

const getCluster = (slackid) => {
  return ['C4K', 6];
};

module.exports = {
  nedbInsert,
  nedbFindOne,
  getTokenFromAffiliation,
  nedbDelete,
  getMaxRating,
  getCluster
};
