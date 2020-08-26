const chatService = require("./services/chat-service");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());


//let promiseMap = new Map();
let promiseMap = {};

// max messages each user will send
let chatSendMax = 3;
// initial chat counter value
let chatCounter = 0;

// time generator waits before sending the first chat message
let initialMessageSend = 10000;

// time to wait between sending messages
let messageSendDelay = 5000;

const engagementStateMap = new Map();
const chatCounterMap = new Map();

wait = async (ms) => {
  try {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  } catch (err) {
    console.log(`Error in function wait: ${err.message}`);
  }
}



// pass in username to this function
createSession = async (displayName) => {
  let sessionId;

  // pass in userName to createSession
  sessionId = await chatService.createSession(displayName);
  console.log("=====> here is sessionID in LOOP: " + sessionId);

  await wait(2000);

  await createCustomerChatWorkFlow(sessionId);

}

async function createEngagement(sessionId)  {
  return await chatService.createEngagement(sessionId);
}


async function createCustomerChatWorkFlow (sessionId) {
  const engagementId = await createEngagement(sessionId);

  console.log(`Here in createCustomerChatWorkFlow function with engagementId: ${engagementId}` ) ;

  console.log(`Wait for promise to be resolved`);
  const promise = new Promise(resolve => {promiseMap.engagementId = resolve})

}



allEvents = (req, res) => {
  //console.log(`Event Received from IX to /partAdded: ${req.body.eventType} and partType: ${req.body.participantType}`);
  // Listen for Agent Join
  if (
      req.body.eventType === "PARTICIPANT_ADDED" &&
      req.body.participantType === "AGENT"
  ) {
    res.sendStatus(200);
    console.log(`Agent Join Received for engId: ${req.body.engagementId} `);

    //promiseMap.set(req.body.engagementId,true);

    // resolve the promise
    //promiseMap.req.body.engagementId = true;


  }
}


app.post("/allEvents", allEvents);


let server = app.listen(3000, function () {
  let host = server.address().address;
  let port = server.address().port;

  // let i = 1
  // let displayName = "Dermot"
  // while (i < 3) {
  //   createChatSession(displayName + i);
  //   console.log(`Running createChatSession(${displayName + i})`)
  //   i++;
  // }

  createSession('Dermot');

  console.log("Example app listening at http://localhost", host, port);
});


// agentJoinPromise = async (engagementId, fulfilled) => {
//   try {
//     let promise = new Promise((resolve) => {
//       if (!fulfilled) {
//         console.log('NOT Fulfilled')
//         promiseMap.set(engagementId, resolve);
//       } else {
//         console.log('going to resolve')
//         resolve('fulfilled')
//         console.log(promise)
//         console.log(promiseMap.get(engagementId))
//       }
//     });
//   } catch (err) {
//     console.log(`Error in agentJoinPromise: ${err.message}`);
//   }
// }