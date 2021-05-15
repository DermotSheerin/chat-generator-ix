const moment = require("moment");

function logMessage(message) {
  const now = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss.SSS");
  console.log(now, message);
}

function errorMessage(message) {
  const now = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss.SSS");
  console.error(now, message);
}

module.exports.logMessage = logMessage;
module.exports.errorMessage = errorMessage;
