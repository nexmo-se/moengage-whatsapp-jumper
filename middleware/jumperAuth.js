const jwt = require("jsonwebtoken");
const { jwtDecode } = require('jwt-decode');
const util = require("../utils/util.js");
const {checkAuth} = require('../datastore/datastore.js');


module.exports = async (req, res, next) => {
    try {
        const authorization = req.header("authorization");
        const authToken = authorization?.split(" ").pop()?.trim();
        console.log("authorization", authorization);
        
        // verify token
        if(process.env.IS_LOCAL != "true") {
          try {
            const secretKey = process.env.JUMPER_SECRET_KEY;
            const algorithm = 'HS256';
            const decoded = util.verifyToken(authToken, algorithm, secretKey);
            const result = await checkAuth(decoded);
            if(result.success) {
              // Token is valid, decoded contains the decoded payload
              console.log('Token is valid:', JSON.stringify(decoded));
            } else {
              // Token verification failed
              console.error('Token verification failed. Token not found in db:', result);
              throw(result);
            }
          } catch (error) {
            console.log("Error", error)
            return res.status(400).send("Invalid token");
          }
        }
        

        let {userId, shopName} = req.query;
        const decoded = jwtDecode(authorization);
        console.log("decoded token", decoded);
        if(decoded.user_id || decoded.userid) {
          userId = decoded.user_id || decoded.userid;
          // decoded.role_id
          console.log('used userId from token', userId)
        }

        // const uid_shop_name = `${userId}_${shopName}`;
        const uid_shop_name = shopName;
        
        if (!authorization || !userId) {
          const dataToLog = {
            authorization,
            userId,
            shopName,
            uid_shop_name,
          };
          console.log('access denied', JSON.stringify(dataToLog) );
          return res.status(403).send("Access denied.")
        };

        req.user = decoded;
        req.userId = userId;
        req.shopName = shopName;
        req.uid_shop_name = uid_shop_name;
        next();
    } catch (error) {
        console.log("Error", error)
        res.status(400).send("Invalid token");
    }
};