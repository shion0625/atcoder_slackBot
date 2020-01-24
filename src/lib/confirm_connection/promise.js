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
/**
 * delete record
 * @param {String} slackid
 */
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
 * find record
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

/**
 * request for max rating
 * @param {String} atcoderUsername
 */

const getMaxRating = (atcoderUsername) => {
  return axios.get(`https://atcoder.jp/users/${atcoderUsername}/history/json`)
    .then(res => {
      const history = res.data.map(x => x.NewRating);
      return history.length > 0 ? Math.max(...history) : 0;
    }).catch(err => console.log(err));
};

/**
 * request for vc, batch from cluster api
 * @param {String} slackid
 */

const getCluster = (slackid, cluster) => {
  return axios.get(`${cluster}/student/${slackid}`)
    .then(res => [res.data.virtual_company, res.data.batch])
    .catch(err => console.log(err));
};

const getVcMemberLen = (vcName, cluster) => {
  return axios.get(`${cluster}/virtual_company/${vcName}`)
    .then(res => {
      const mem = res.data.members;
      return mem ? mem.length : 0;
    });
};

module.exports = {
  nedbInsert,
  nedbFindOne,
  getTokenFromAffiliation,
  nedbDelete,
  getMaxRating,
  getCluster,
  getVcMemberLen
};
