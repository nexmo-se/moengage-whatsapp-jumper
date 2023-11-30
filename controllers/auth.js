const controller = {
  connectorAuth: async (req, res, next) => {
    console.log("call moengage_auth post", JSON.stringify(req.body))
  
    if (!req.headers.authorization) {
      mes = {
        "status": "failure",
        "error" : {
        "code" : "7000",
        "message" : "Invalid credentials"
        }
      }
      return res.json(mes);
    }else{
      const token = req.headers.authorization.split(' ')[1];
      if(token!= _token){
        mes = {
          "status": "failure",
          "error" : {
          "code" : "7000",
          "message" : "Invalid credentials"
          }
        }
        return res.json(mes);     
      }
    }
    next();
  }
};

module.exports = controller;
