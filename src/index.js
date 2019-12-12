require('dotenv').config();
const SheetOperation = require('./lib/SheetOperation');
const DBOperation = require('./lib/DBOperation');
const { RTMClient } = require('@slack/rtm-api');
const { Handler } = require('./lib/confirm_connection/k');
// const { getRating } = require('./lib/confirm_connection/promise');

const main = async () => {
  const SLACK_TOKEN = process.env.SLACK_TOKEN;
  const rtm = new RTMClient(SLACK_TOKEN);

  const DOP = new DBOperation(process.env.DBPath);
  const Students = await DOP.StudentsInit();

  const handler = new Handler(SLACK_TOKEN, Students);

  await rtm.start();

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

  const atcoderSheet = async () => {
    const dockey = process.env.dockey;
    const creds = {
      private_key: process.env.private_key,
      client_email: process.env.client_email
    };
    const SOP = new SheetOperation(dockey, creds);
    // const vcValue = await Students.findAll(
    //   { attributes: ['slack_username', 'atcoder_username', 'email', 'batch', 'rating'] });
    await SOP.updateSheets();
  };
  atcoderSheet();
};

main();
