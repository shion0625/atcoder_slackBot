const Sequelize = require('sequelize');
const StudentsModel = require('../model/Students');

class DBOperation {
  constructor (storage) {
    this.sequelize = new Sequelize({
      dialect: 'sqlite',
      storage
    });
  }

  async StudentsInit () {
    let Students = StudentsModel(this.sequelize, Sequelize);
    Students = await Students.sync();
    return Students;
  }
}

module.exports = DBOperation;
