# **Moengage – Jumper Whatsapp API Connector**

This application creates a middleware to enable Moengages's general connector to work with Jumper's Whatsapp API

# **Deployment Guide**

## **1. Install dependencies:**

    npm install axios dotenv express qs redis morgan p-ratelimit agentkeepalive datastore_key_file.json

## **2. Populate “.env”**
Copy `.env.samp` file as `.env` and put in the values for the following:
 
 

 - **SUBSCRIBED_CALLBACK_URL**
	- This is the callback we pass to jumper when we subscribe to events
- **MOENGAGE_CALLBACK_URL**
	- This is the URL we post Moengage Callbacks
- **PORT**
	- port where we run this service
- **MOENGAGE_AUTH_AGAINTS**
	- This is what moengage authenticates against. We give this to them if they ask for the token
- **JUMPER_BASIC_AUTH**
	- This is used to call Jumper's Refresh Token API
    - Jumper basic auth: https://developers.jumper.ai/docs/oauth-api/1/routes/oauth/refresh/post
    - 'Basic base64<client_key + ":" + client_secret>'
- **SEED_REFRESH_TOKEN**
	- If no refresh token is stored, manually generate a new one and put it here
	- **Note**: You can manually store the refresh token in redis using the key "jumper_refresh_token"
   
	 

   
 ### LIMITER SETTINGS ###

- 	**RATE_PER_SECOND**
	- Rate per second allowed.
- **CONCURRENT_API_CALLS**
	- Number of concurrent calls allowed.




### KEEPALIVE SETTINGS ###
- **MAX_SOCKETS**
	- Maximum number of sockets to allow per host. Default for Node 0.10 is 5, default for Node 0.12 is Infinity
- **MAX_FREE_SOCKETS**
	- Maximum number of sockets to leave open in a free state. 
- **SOCKET_TIMEOUT**
	- Socket timeout in milliseconds. This will set the timeout after the socket is connected.
- **FREE_SOCKET_KEEPALIVE**
	- How long a free socket is kept alive for reuse.

#Datastore Kind
DT_KIND=

#Project ID for this Datastore
DT_PROJECT_ID=

#Path of Data Store File
DT_JSON_PATH=datastore_key_file.json


### DATA STORE SETTINGS ###
- **DT_KIND**
	- Data Store Kind
- **DT_PROJECT_ID**
	- Data Store Project ID (you can find this in the Service Account file json)
- **DT_JSON_PATH**
  - This is the Service Account JSON File (you get this from google)

## 3. Run whatsapp-jumper-connector,js

    node whatsapp-jumper-connector.js

**Note:**

This application will automatically check and refresh the jumper Authentication Token eveyrtime there is a Whatsapp message send request.

It checks redis first and if it finds an unexpired token, uses that. If not, it will use the stored refresh token to request a new AUTH token and Refresh token then stores both of them into redis.

This application will also check for an existing subscription to Jumper callbacks at start and automatically sets one if none is found.