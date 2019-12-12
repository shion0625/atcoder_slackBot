'use strict';

const StudentsModel = (sequelize, DataTypes) => sequelize.define('Students', {
  slack_id: DataTypes.CHAR(100),
  slack_username: DataTypes.CHAR(100),
  email: DataTypes.CHAR(255),
  atcoder_username: DataTypes.CHAR(100),
  vc_name: DataTypes.CHAR(100),
  batch: DataTypes.TINYINT,
  rating: DataTypes.INTEGER
}, {});

module.exports = StudentsModel;
