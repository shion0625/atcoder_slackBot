const short = require('short-uuid');
const { WebClient } = require('@slack/web-api');
const {
  nedbInsert,
  nedbFindOne,
  getTokenFromAffiliation,
  nedbDelete,
  getMaxRating,
  getCluster
} = require('./promise');

class Handler {
  constructor (slackToken, Students, icon) {
    this.webClient = new WebClient(slackToken);
    this.Students = Students;
    this.icon = icon;
  }

  async connectHandler (event) {
    const translator = short();
    const arg = event.text.split(' ');
    if (arg.length < 2) {
      this.sendMessage('invalid arguement expected `!atcoder connect atcoder-username`', event.channel, event.ts);
    }
    const atcoderUsername = arg[2];
    const token = translator.generate();

    this.sendMessage(`Your token is \`(${token})\`, Please include it in your profile's affiliation.`, event.channel, event.ts);

    const document = {
      slack_id: event.user,
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
    const [vcName, batch] = await getCluster();
    const rating = await getMaxRating(atcoderUsername);
    if (token === confirmingUser.token) {
      this.sendMessage('Succesful connection', slackChannel, thread);
      await this.upsertStudent(slackId, realName, email, atcoderUsername, vcName, batch, rating);
    } else {
      this.sendMessage(`Sorry, we cannot confirm your atCoder account \`${atcoderUsername}\`. Please make sure you connected the right username.`, slackChannel, thread);
    }
    nedbDelete(slackId)
      .catch(err => console.log(err));
  }

  async studentRatingCommand (event) {
    const slackIdMention = event.text.trim().split(/!atcoder_rating|<@|>/).join('').trim();
    const student = await this.Students.findAll({
      attributes: ['atcoder_username', 'rating'],
      where: {
        slack_id: slackIdMention
      }
    }).catch(err => console.log(err));
    if (student.length !== 0) {
      const username = student[0].dataValues.atcoder_username;
      const rating = student[0].dataValues.rating;
      const msg = `${username}'s atcoder rating is ${rating}.`;
      this.sendMessage(msg, event.channel, event.ts);
    } else {
      this.sendMessage('Cannot Find Atcoder username\n Please connect :smile:', event.channel, event.ts);
    }
  }

  async batchRatingCommand (event) {
    const batch = parseInt(event.text.trim().split(/!atcoder_batch_rating/).join('').trim());
    const channel = event.channel;
    const thread = event.ts;
    if (!Number.isNaN(batch)) {
      const students = await this.Students.findAll({
        where: {
          batch
        }
      }).catch((err) => console.log(err));
      if (students.length !== 0) {
        const { averageRate, highestRate } = this.highAverageRating(students);
        this.sendMessage(`:tada: The highest rate is ${highestRate}.\n:sparkles: The average rating is ${averageRate}`, channel, thread);
      } else {
        this.sendMessage('Cannot find your batch', channel, thread);
      }
    } else {
      this.sendMessage(':fire: Invalid command.\n Expected Example: !atcoder_batch_rating 7', channel, thread);
    }
  }

  async vcRatingCommand (event) {
    const vcName = event.text.trim().split(/!atcoder_vc_rating/).join('').trim();
    const channel = event.channel;
    const thread = event.ts;

    const students = await this.Students.findAll({
      where: {
        vc_name: vcName
      }
    }).catch((err) => console.log(err));

    if (students.length !== 0) {
      const { averageRate, highestRate } = this.highAverageRating(students);
      this.sendMessage(`:tada: The highest rate is ${highestRate}.\n:sparkles: The average rating is ${averageRate}`, channel, thread);
    } else {
      this.sendMessage('Cannot find your vc', channel, thread);
    }
  }

  highAverageRating (students) {
    let highestRate = 0;
    let averageRate = 0;
    for (const student of students) {
      if (student.rating > highestRate) {
        highestRate = student.rating;
        averageRate += student.rating;
      }
    }
    averageRate = (averageRate / students.length).toFixed(2);
    return { averageRate, highestRate };
  }

  sendMessage (message, channel, thread) {
    this.webClient.chat.postMessage({
      text: message,
      channel,
      icon_emoji: ':heart:',
      thread_ts: thread
    }).catch(err => console.log(err));
  }

  upsertStudent (slackId, slackUsername, email, atcoderUsername, vcName, batch, rating) {
    const doc = {
      slack_id: slackId,
      slack_username: slackUsername,
      email,
      atcoder_username: atcoderUsername,
      vc_name: vcName,
      batch,
      rating
    };
    return this.Students
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
