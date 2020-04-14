const blecordova = require("./blecordova.js");
const blewechat = require("./blewechat.js");
const logs = require("./logs.js");


exports.create = (options) => {
  if (options && options.logs === false) {
    logs.enableLogs(false);
  }

  if (window && window.cordova) {
    logs.log("multible: detected Cordova");
    return new blecordova.BleCordova();
  }
  if (global && global.wx) {
    logs.log("multible: detected WeChat");
    return new blewechat.BleWeChat();
  }
  throw new Error("Unknown environment");
};

