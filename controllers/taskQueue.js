const {CloudTasksClient} = require('@google-cloud/tasks');
const util = require('../utils/util');
const api = require('../utils/api');

const cloudTaskClientDetails = {
  projectId: process.env.DT_PROJECT_ID,
};

// code to connect from local
if (process.env.DT_JSON_PATH) {
  cloudTaskClientDetails.keyFilename = process.env.DT_JSON_PATH;
}

const cloudTaskClient = new CloudTasksClient(cloudTaskClientDetails);

const controller = {
  moEngageTaskQueue: async (req, res) => {
    try {
      // queName is being used as QUEUE ID. QUEUE ID can contain letters ([A-Za-z]), numbers ([0-9]), or hyphens (-). The maximum length is 100 characters
      const {userId, shopName} = req.query;
      const uid_shop_name = `${userId}_${shopName}`;
      
      let token = ''; // moenage jumper app autherization token
      if(req?.headers?.authorization){
        token = req.headers.authorization.split(' ')[1];
      } else {
        token = api.getJumperToken({uid_shop_name});
      }

      if(!token) {
        console.error(`ERROR: token not found for ${uid_shop_name}, while adding task queue`);
        return;
      }

      // const { token } = util.getReqToken();
      const queName = `MOENGAGE-${userId}-${shopName}`.replace(/[^a-zA-Z0-9-]/g, "").substring(0, 99);

      const project = process.env.DT_PROJECT_ID;
      const location = process.env.QUEUE_LOCATION;
      const payload = JSON.stringify(req.body);
      const inSeconds = 0;
      const url = `${process.env.ROOT_URL}/jumper_send_whatsapp?shopName=${shopName}&userId=${userId}`;

      try {
        await controller.createQueue(queName);
      } catch (error) {
        console.error('error', JSON.stringify(error));
      }

      await controller.createHttpTask({project, location, queName, payload, inSeconds, url, token});

      return res.status(200).json({'success': 'true'});
    } catch (error) {
      console.error('error at taskQueue controller', error);
      res.status(500).json({status: 'false', error: error});
    }
  },
  createHttpTask: async ({project, location, queue, payload, inSeconds, url, token}) => {
    // Construct the fully qualified queue name.
    const parent = cloudTaskClient.queuePath(project, location, queue);

    const task = {
      httpRequest: {
        headers: {
          'Content-Type': 'application/json', // Set content type to ensure compatibility your application's request parsing
          'Authorization': token
        },
        httpMethod: process.env.QUEUE_SERVICE_METHOD, // 'POST',
        url: url, // '/log_payload',
      },
    };

    if (payload) {
      task.httpRequest.body = Buffer.from(payload).toString('base64');
    }

    if (inSeconds) {
      // The time when the task is scheduled to be attempted.
      task.scheduleTime = {
        seconds: parseInt(inSeconds) + Date.now() / 1000,
      };
    }

    // Send create task request.
    console.log('Create task params:', JSON.stringify(task));
    const request = {parent: parent, task: task};
    const [response] = await cloudTaskClient.createTask(request);
    console.log(`Created task ${response.name}`);
  },
  createQueue: async (queueName) => {
    console.log( 'Create queue params', JSON.stringify( {DT_PROJECT_ID: process.env.DT_PROJECT_ID, QUEUE_LOCATION: process.env.QUEUE_LOCATION, queueName}) );

    // Send create queue request.
    const [response] = await cloudTaskClient.createQueue({
      // The fully qualified path to the location where the queue is created
      parent: cloudTaskClient.locationPath(process.env.DT_PROJECT_ID, process.env.QUEUE_LOCATION),
      queue: {
        // The fully qualified path to the queue
        name: cloudTaskClient.queuePath(process.env.DT_PROJECT_ID, process.env.QUEUE_LOCATION, queueName),
        appEngineHttpQueue: {
          appEngineRoutingOverride: {
            // The App Engine service that will receive the tasks.
            service: 'default',
          },
        },
        rateLimits: {
          "maxDispatchesPerSecond": 10,
          // "maxBurstSize": 10,
          "maxConcurrentDispatches": 10,
        },
        retryConfig: {
          "maxAttempts": 6,
          // "maxRetryDuration": '3600s',
          // // "minBackoff": '1800s',
          // // "maxBackoff": '3600s',
          "maxDoublings": 16,
        },
      },
    });
    console.log(`Created queue ${response.name}`);
  },
};

module.exports = controller;
