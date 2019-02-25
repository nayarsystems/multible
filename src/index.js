const blecordova = require("./blecordova.js");
const blewechat = require("./blewechat.js");

exports.create = () => {
  if (window && window.cordova) {
    console.log("multible: detected Cordova");
    return new blecordova.BleCordova();
  }
  if (global && global.wx) {
    console.log("multible: detected WeChat");
    return new blewechat.BleWeChat();
  }
  throw new Error("Unknown environment");
};
