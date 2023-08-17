// Copyright 2019 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

const { json } = require('express');

// sample-metadata:
//   title: Cloud Tasks Create HTTP Target
//   description: Create Cloud Tasks with a HTTP Target
//   usage: node createHttpTask.js <projectId> <queueName> <location> <url> <payload> <delayInSeconds>

/**
 * Create a task with an HTTP target for a given queue with an arbitrary payload.
 */
function addTask(
  project = process.env.DT_PROJECT_ID, // Your GCP Project id
  queue = process.env.QUEUE_NAME, // Name of your Queue
  location = process.env.QUEUE_LOCATION, // The GCP region of your queue
  payload = '', // The task HTTP request body
  inSeconds = 0 // Delay in task execution
) {
  // [START cloud_tasks_create_http_task]
  // Imports the Google Cloud Tasks library.
  const {CloudTasksClient} = require('@google-cloud/tasks');

  // Instantiates a client.
  const client = new CloudTasksClient({ fallback: true });

  async function createHttpTask() {
    // TODO(developer): Uncomment these lines and replace with your values.
    // const project = 'my-project-id';
    // const queue = 'my-queue';
    // const location = 'us-central1';
    // const url = 'https://example.com/taskhandler';
    // const payload = 'Hello, World!';
    // const inSeconds = 180;

    // Construct the fully qualified queue name.
    const parent = client.queuePath(project, location, queue);

    const task = {
      httpRequest: {
        headers: {
          'Content-Type': 'application/json', // Set content type to ensure compatibility your application's request parsing
          'Authorization': `Bearer ${process.env.MOENGAGE_AUTH_AGAINST}`
        },
        httpMethod: process.env.QUEUE_SERVICE_METHOD, //'POST',
        url: process.env.QUEUE_SERVICE_URL //'/log_payload',
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
    console.log('Sending task:', JSON.stringify(task));
    const request = {parent: parent, task: task};
    const [response] = await client.createTask(request);
    console.log(`Created task ${response.name}`);
  }
  createHttpTask();
  // [END cloud_tasks_create_http_task]
}

process.on('unhandledRejection', err => {
  console.error(JSON.stringify(err.message));
  process.exitCode = 1;
});

// main(...process.argv.slice(2));
module.exports = {addTask}