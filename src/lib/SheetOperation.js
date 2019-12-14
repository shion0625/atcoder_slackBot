const { ArrayToGoogleSheets } = require('array-to-google-sheets');

class SheetsOperation {
  constructor (dockey, creds) {
    this.sop = new ArrayToGoogleSheets(dockey, creds);
    this.vcAvgValue = [['VC name', 'Average rating', 'Lowest rating', 'Highest rating', 'vc members', 'vc atcoder members', 'atcoder user %']];
    this.studentRating = [['Slack-Username', 'atcoder-profile', 'Email', 'Batch', 'Virtual-Company', 'Rating']];
  }

  insertVCValue (value) {
    const len = value.length;
    if (len > 0) {
      value[0].push({ formula: '=ARRAYFORMULA(%1:%2/%3:%4 * 100)', cells: [{ row: 2, col: 6 }, { row: len + 1, col: 6 }, { row: 2, col: 5 }, { row: len + 1, col: 5 }] });
      this.vcAvgValue = this.vcAvgValue.concat(value);
    }
  }

  insertStudentValue (value) {
    this.studentRating = this.studentRating.concat(value);
  }

  async updateSheets () {
    await this.sop.updateGoogleSheets('virtual_company_average', this.vcAvgValue)
      .catch(err => console.log(err));
    await this.sop.updateGoogleSheets('student_rating', this.studentRating)
      .catch(err => console.log(err));
  }
}
module.exports = SheetsOperation;
