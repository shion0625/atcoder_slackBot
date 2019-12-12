const short = require('short-uuid');
const { WebClient } = require('@slack/web-api');
const {
  nedbInsert,
  nedbFindOne,
  getTokenFromAffiliation,
  nedbDelete,
  getRating,
  getCluster
} = require('./promise');

class Handler {
  constructor (slackToken, Students) {
    this.webClient = new WebClient(slackToken);
    this.Students = Students;
  }

  async connectHandler (event) {
    const translator = short();
    const slackId = event.user;
    const slackMessage = event.text;
    const atcoderUsername = slackMessage.split(' ')[2];
    const token = translator.generate();

    this.sendMessage(event.ts, event.channel, `Your token is \`(${token})\`, Please include it in your profile's affiliation.`);

    const document = {
      slack_id: slackId,
      atcoder_username: atcoderUsername,
      token: token,
      createdAt: new Date().getTime()
    };
    nedbInsert(document)
      .catch(err => console.log(err));
  }

  async confirmHandler (event) {
    const slackId = event.user;
    const slackChannel = event.channel;
    const thread = event.ts;
    const confirmingUser = await nedbFindOne({ slack_id: slackId }).catch(
      err => console.error(err)
    );
    const profile = await this.webClient.users.info({ user: slackId }).catch(
      err => console.error(err)
    );
    const email = profile.user.profile.email;
    const realName = profile.user.profile.real_name;

    if (!confirmingUser) {
      return;
    }
    const atcoderUsername = confirmingUser.atcoder_username;
    const token = await getTokenFromAffiliation(atcoderUsername);
    const [vcName, batch] = getCluster();
    const rating = getRating();
    if (token === confirmingUser.token) {
      this.sendMessage(thread, slackChannel, 'Succesful connection');
      await this.upsertStudent(slackId, realName, email, atcoderUsername, vcName, batch, rating);
    } else {
      this.sendMessage(thread, slackChannel, `Sorry, we cannot confirm your atCoder account \`${atcoderUsername}\`. Please make sure you connected the right username.`);
    }
    nedbDelete(slackId)
      .catch(err => console.log(err));
  }

  sendMessage (thread, channel, message) {
    this.webClient.chat.postMessage({
      text: message,
      channel,
      icon_emoji: ':heart:',
      thread_ts: thread
    }).catch(err => console.log(err));
  }

  async upsertStudent (slackId, slackUsername, email, atcoderUsername, vcName, batch, rating) {
    const doc = {
      slack_id: slackId,
      slack_username: slackUsername,
      email,
      atcoder_username: atcoderUsername,
      vc_name: vcName,
      batch,
      rating
    };
    await this.Students
      .findOne({ where: { slack_id: slackId } })
      .then((obj) => {
        if (obj) {
          obj.update(doc);
        } else {
          this.Students.create(doc);
        }
      }).catch(err => console.log(err));
  }
}

module.exports = {
  Handler
};
