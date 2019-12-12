require('dotenv').config();
const SheetOperation = require('./lib/SheetOperation');
const DBOperation = require('./lib/DBOperation');
const { RTMClient } = require('@slack/rtm-api');
const { Handler } = require('./lib/confirm_connection/k');
const CronJob = require('cron').CronJob;
const { getMaxRating } = require('./lib/confirm_connection/promise');

const main = async () => {
  const SLACK_TOKEN = process.env.SLACK_TOKEN;
  const rtm = new RTMClient(SLACK_TOKEN);

  const DOP = new DBOperation(process.env.DBPath);
  const Students = await DOP.StudentsInit();

  const handler = new Handler(SLACK_TOKEN, Students);

  rtm.on('message', event => {
    if (!('text' in event)) {
      return;
    }
    if (event.text.match(/^!atcoder connect \w{2,20}$/g)) {
      handler.connectHandler(event);
    } else if (event.text.match(/^!atcoder confirm$/g)) {
      handler.confirmHandler(event);
    }
  });
  await rtm.start();

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
      });
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

    const vcValue = vcData.map(vc => {
      const ratings = Object.values(vc);
      const atcoderMembers = ratings.length;
      const lowest = Math.min(ratings);
      const highest = Math.max(ratings);
      const avg = ratings.reduce((a, b) => a + b) / atcoderMembers;
      const name = Object.keys(vc)[0];
      // need vc members
      return [name, avg, lowest, highest, atcoderMembers, atcoderMembers];
    });

    SOP.insertVCValue(vcValue);
    SOP.insertStudentValue(studentsValue);

    await SOP.updateSheets()
      .then(() => console.log('Sheet updated'))
      .catch(err => console.log(err));
  };
  atcoderSheet();
};
const job = new CronJob(process.env.SHEET_TIME, () => {

});
job.start();
main();
