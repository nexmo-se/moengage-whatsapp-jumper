const jwt = require("jsonwebtoken");
const {getUserDetailsBy_uid_shop_name} = require('../datastore/datastore');

module.exports = async (req, res, next) => {
    try {
        const authorization = req.header("authorization");
        const authToken = authorization?.split(" ").pop()?.trim();
        let {userId, shopName} = req.query;
        const decoded = jwt.verify(authToken, process.env.MOENGAGE_SECRET_KEY);
        console.log("decoded token", decoded);
        if(decoded.userId) {
          userId = decoded.userId
          console.log('used userId from token', userId)
        }

        // const uid_shop_name = `${userId}_${shopName}`;
        const uid_shop_name = `${shopName}`;
        const {mo_engage_jumper_app_token, token} = await getUserDetailsBy_uid_shop_name(uid_shop_name);
        
        if (!authToken || !mo_engage_jumper_app_token || authToken != mo_engage_jumper_app_token) {
          const dataToLog = {
            authToken,
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
        req.mo_engage_jumper_app_token = mo_engage_jumper_app_token;
        req.jumperToken = token;
        next();
    } catch (error) {
        res.status(400).send("Invalid token");
    }
};