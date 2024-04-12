const {PreciseDate} = require('@google-cloud/precise-date');
const util = {
  getReqToken: (req) => {
    // const {userId, shopName} = req.query;
    let uid_shop_name = req.uid_shop_name;
    const authorization = req.headers.authorization;
    return {uid_shop_name: uid_shop_name, token: authorization};
  },
  dateTimeIso: (dateParam) => {
    let date;
    if (dateParam) {
      date = new PreciseDate(dateParam);
    } else {
      date = new PreciseDate();
    }
    return date.toISOString();
  },
  getDateForExpirySeconds: (seconds) => {
    let timeObject = new Date();
    const milliseconds = seconds * 1000; // 10 seconds = 10000 milliseconds
    timeObject = new Date(timeObject.getTime() + milliseconds);
    return util.dateTimeIso(timeObject);
  },
  findKeyValue: (obj, key, val) => {
    return Object.keys(obj).filter(k => obj[key] === val && k ===key );
  },
  currentUtcTime: () => {
    return new Date(new Date().toUTCString());
  }
};

module.exports = util;
