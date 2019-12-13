require('dotenv').config();

const SheetOperation = require('./lib/SheetOperation');
const DBOperation = require('./lib/DBOperation');
const { RTMClient } = require('@slack/rtm-api');
const { Handler } = require('./lib/confirm_connection/handler');
const CronJob = require('cron').CronJob;
const { getMaxRating, getVcMemberLen } = require('./lib/confirm_connection/promise');
const delay = require('delay');

const main = async () => {
  const SLACKBOT_TOKEN = process.env.SLACKBOT_TOKEN;
  const rtm = new RTMClient(SLACKBOT_TOKEN);

  const DOP = new DBOperation(process.env.DBPath);
  const Students = await DOP.StudentsInit();

  const handler = new Handler(SLACKBOT_TOKEN, Students);

  rtm.on('message', event => {
    if (!('text' in event)) {
      return;
    }
    if (event.text.match(/^!atcoder connect \w{2,20}$/g)) {
      handler.connectHandler(event);
    } else if (event.text.match(/^!atcoder confirm$/g)) {
      handler.confirmHandler(event).then(() => {
        atcoderSheet();
      });
    } else if (event.text.match(/^!atcoder_rating <@+.+>$/g)) {
      handler.studentRatingCommand(event);
    } else if (event.text.match(/^!atcoder_vc_rating \w{1,20}/g)) {
      handler.vcRatingCommand(event);
    } else if (event.text.match(/^!atcoder_batch_rating \w{1,2}/g)) {
      handler.batchRatingCommand(event);
    }
  });

  await rtm.start();

  /**
   * consistantly update db
   */
  const updateDB = async () => {
    const atcoderNames = await Students.findAll({
      attributes: ['atcoder_username']
    });
    atcoderNames.forEach(async x => {
      const rating = await getMaxRating(x.atcoder_username);
      Students.update({ rating }, {
        where: {
          atcoder_username: x.atcoder_username
        }
      }).catch(err => console.log(err));
      await delay(100);
    });
  };
  /**
   * consistantly update google sheets
   */
  const atcoderSheet = async () => {
    const dockey = process.env.dockey;
    const creds = {
      private_key: process.env.private_key,
      client_email: process.env.client_email
    };
    const SOP = new SheetOperation(dockey, creds);

    const values = await Students.findAll(
      {
        attributes: ['slack_username', 'atcoder_username', 'email', 'batch', 'vc_name', 'rating']
      }).catch(err => console.log(err));

    const studentsValue = values.map(x => {
      const value = Object.values(x.dataValues);
      value[1] = `https://atcoder.jp/users/${value[1]}`;
      return value;
    });
    const vcData = values.map(x => {
      const value = x.dataValues;
      const VCs = { [value.vc_name]: [] };
      VCs[value.vc_name].push(value.rating);
      return VCs;
    });

    let vcValue = vcData.map(async vc => {
      const name = Object.keys(vc)[0];
      if (name === '') {
        return null;
      }
      const ratings = Object.values(vc);
      const atcoderMembers = ratings.length;
      const lowest = Math.min(ratings);
      const highest = Math.max(ratings);
      const avg = ratings.reduce((a, b) => a + b) / atcoderMembers;
      const vcMemberLen = await getVcMemberLen(name);
      return [name, avg, lowest, highest, vcMemberLen, atcoderMembers];
    });

    vcValue = await Promise.all(vcValue);
    vcValue = vcValue.filter(x => x !== null);

    SOP.insertVCValue(vcValue);
    SOP.insertStudentValue(studentsValue);

    SOP.updateSheets()
      .then(() => console.log('Sheet updated'))
      .catch(err => console.log(err));
  };
  updateDB();
  atcoderSheet();

  /**
   * schedule cronjob
   */
  const job = new CronJob(process.env.SCHEDULE, () => {
    updateDB();
    atcoderSheet();
  });
  job.start();
};

main();
