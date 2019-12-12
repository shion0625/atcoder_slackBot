const short = require('short-uuid');
const webclient = require('@slack/web-api');
const {
  nedbInsert,
  nedbFindOne,
  getTokenFromAffiliation,
  nedbDeleteOne,
  getRating,
  getCluster
} = require('./promise');

/**
 *
 * @param {event of message} event
 */
const connectHandler = async (event, webclient) => {
  const translator = short();
  const slackId = event.user;
  const slackMessage = event.text;
  const atcoderUsername = slackMessage.split(' ')[2];
  const token = translator.generate();

  sendMessage(event.ts, event.channel, `Your token is \`(${token})\`, Please include it in your profile's affiliation.`);

  const document = {
    slack_id: slackId,
    atcoder_username: atcoderUsername,
    token: token,
    createdAt: new Date().getTime()
  };

  nedbInsert(document).catch(err => {
    if (err) {
      console.error(err);
    }
  });
};

/**
 *
 * @param {event of message} event
 */
const confirmHandler = async (event, webclient, Students) => {
  const slackId = event.user;
  const slackChannel = event.channel;
  const thread = event.ts;
  const confirmingUser = await nedbFindOne({ slack_id: slackId }).catch(
    err => console.error(err)
  );
  const profile = await webclient.users.profile().catch(
    err => console.error(err)
  );

  if (!confirmingUser) {
    return;
  }
  const atcoderUsername = confirmingUser.atcoderUsername;
  const token = await getTokenFromAffiliation(atcoderUsername);
  const { vcName, batch } = await getCluster();
  const rating = await getRating();

  if (token === confirmingUser.token) {
    sendMessage(thread, slackChannel, 'Succesful connection');
    insertStudent(Students, slackId, profile.name, atcoderUsername, vcName, batch, rating);
    nedbDeleteOne(slackId).catch(err => console.log(err));
  } else {
    sendMessage(thread, slackChannel, `Sorry, we cannot confirm your atCoder account (${atcoderUsername}). Please make sure you connected the right username.`);
  }
};

const sendMessage = (thread, channel, message) => {
  webclient.chat.postMessage({
    text: message,
    channel,
    icon_emoji: ':heart:',
    thread_ts: thread
  });
};

const insertStudent = (Students, slackId, slackUsername, atcoderUsername, vcName, batch, rating) => {
  Students.create({
    slack_id: slackId,
    slack_username: slackUsername,
    atcoder_username: atcoderUsername,
    vc_name: vcName,
    batch,
    rating
  });
};

module.exports = {
  connectHandler,
  confirmHandler
};
