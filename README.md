**Moengage – Jumper Whatsapp API Connector**

This application creates a middleware to enable Moengages's general connector to work with Jumper's Whatsapp API

**Deployment Guide**

**1. Install dependencies:**
npm install axios dotenv express qs redis

**2. Populate “.env”**

    #This is the callback we pass to jumper when we subscribe to events
    
    **SUBSCRIBED_CALLBACK_URL="https://"**
    
    #this is the URL we post Moengage Callbacks
    
    **MOENGAGE_CALLBACK_URL="https://"**
    
    #port where we run this service
    
    **PORT=3001**
    
    #This is what moengage authenticats against. We give this to them if they ask for the token
    
    **MOENGAGE_AUTH_AGAINST="xxxxxauth token"**
    
    #Jumper basic auth: https://developers.jumper.ai/docs/oauth-api/1/routes/oauth/refresh/post
    
    #'Basic base64<client_key + ":" + client_secret>'
    
    **JUMPER_BASIC_AUTH="Basic xxxxxbasic credentials"**
    
    #if no refresh token is stored, manually generate a new one and put it here
    
    #you can manually store the refresh token in redis using the key "jumper_refresh_token"
    
    **SEED_REFRESH_TOKEN="SEED REFRESH TOKEN"**

**3. Run whatsapp-jumper-connector,js**

    node whatsapp-jumper-connector.js

**Note:**

This application will automatically check and refresh the jumper Authentication Token eveyrtime there is a Whatsapp message send request.

It checks redis first and if it finds an unexpired token, uses that. If not, it will use the stored refresh token to request a new AUTH token and Refresh token then stores both of them into redis.

This application will also check for an existing subscription to Jumper callbacks at start and automatically sets one if none is found.
