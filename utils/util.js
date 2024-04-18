const {PreciseDate} = require('@google-cloud/precise-date');
const jwt = require("jsonwebtoken");

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
  },
  verifyToken: (token, algorithm, secretKey) => {
    // Secret key used to sign the token
    // const secretKey = env.SECRET_KEY;

    // Algorithm used to sign the token (e.g., HS256)
    // const algorithm = 'HS256';

    // Verify the token
    return jwt.verify(token, secretKey, { algorithms: [algorithm] }, (err, decoded) => {
      if (err) {
        // Token verification failed
        console.error('Token verification failed:', err.message);
        throw(err);
      } else {
        // Token is valid, decoded contains the decoded payload
        console.log('Token is valid:', decoded);
        return decoded;
      }
    });
  }
};

module.exports = util;
