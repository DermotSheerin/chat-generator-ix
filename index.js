const chatService = require("./services/chat-service");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

const promiseMap = {};
const engagementDetailsMap = {};

// max messages each user will send
const chatSendMax = 3; // NOTE could add random here
// initial chat counter value
const chatCounter = 0;

// delay between customer responding to agent chat messages (sec)
const customerRespondChatDelay = 5; // NOTE could add random here

// time generator waits before sending the first chat message
const initialMessageSend = 10000;

wait = async (ms) => {
  try {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  } catch (err) {
    console.log(`Error in function wait: ${err.message}`);
  }
};

async function createCustomerChatWorkFlow(displayName) {
  // pass in userName to createSession
  const sessionId = await chatService.createSession(displayName);
  console.log(`=====> here is sessionID: ${sessionId}`);

  await wait(2000);

  // create and store Engagement details
  const engagementDetails = await chatService.createEngagement(sessionId);
  // store engagement details in map
  engagementDetailsMap[engagementDetails.engagementId] = {
    sessionId,
    correlationId: engagementDetails.correlationId,
    dialogId: engagementDetails.dialogId,
    chatCounter: 0,
  };
  console.log(
    `=====> here is engagementID: ${engagementDetails.engagementId} and its stored details chatCounter: ${chatCounter}`
  );

  /////////////////////////// create Promise for agent wait
  const promiseAgentWait = new Promise((resolve) => {
    promiseMap[engagementDetails.engagementId] = resolve;
  });
  console.log(
    `Wait for promise to be resolved in express message handler for agent join`
  );
  let result = await promiseAgentWait;
  console.log(`Agent has now JOINED:  ${result}`);

  // wait before sending chat to Agent
  await wait(10000);

  await sendChat(
    engagementDetails.engagementId,
    "First Message Sent by Customer..."
  );

  /////////////////////////// create Promise to wait for Message Received from Agent

  const promiseMessageReceived = new Promise((resolve) => {
    promiseMap[engagementDetails.engagementId] = resolve;
  });
  console.log(
    `Wait for promise to be resolved in express message handler for MESSAGE RECEIVED`
  );
  let awaitMessageReceived = await promiseMessageReceived;

  console.log(`Message has been Received:  ${awaitMessageReceived}`);
}

async function sendChat(engagementId, chatMessage) {
  // retrieve engagement details from engagementDetailsMap
  const engagementDetails = engagementDetailsMap[engagementId];

  // if the chatCounter reaches the chatSendMax count then send a BYE to Agent, the far end will terminate the interaction
  if (engagementDetails.chatCounter >= chatSendMax) {
    chatMessage = "###BYE###";
  }
  console.log(
    `=====================> chatCounter: ${engagementDetails.chatCounter}`
  );

  await chatService.sendChat(
    engagementDetails.sessionId,
    engagementId,
    engagementDetails.correlationId,
    engagementDetails.dialogId,
    chatMessage
  );

  engagementDetails.chatCounter++;
}

allEvents = (req, res) => {
  // Listen for Agent Join
  if (
    req.body.eventType === "PARTICIPANT_ADDED" &&
    req.body.participantType === "AGENT"
  ) {
    res.sendStatus(200);
    console.log(`Agent Join Received for engId: ${req.body.engagementId} `);

    // verify the engagementID is stored in the promiseMap
    return promiseMap[req.body.engagementId]
      ? (console.log(
          `Engagement ID IS contained within the promiseMap: ${req.body.engagementId}`
        ),
        // access the resolve function inside the promiseMap and pass in true to resolve function for promiseAgentWait
        promiseMap[req.body.engagementId](true),
        console.log(
          `============> Agent Join Promise has been resolved and set to true`
        ))
      : console.log(
          `Engagement ID is NOT contained within the promiseMap: ${req.body.engagementId}`
        );
  } else if (req.body.senderType === "AGENT") {
    res.sendStatus(200);
    console.log("Chat Message Received");
    console.log(`Here is the eventType: ${req.body.eventType}`);
    console.log(`Here is the senderType: ${req.body.senderType}`);
    console.log(
      `Agent Sent this:\n #########   ${req.body.body.elementText.text}   #########`
    );

    // on receipt of a message from Agent, call the sendChat function and pass in the engID and message text
    setTimeout(() => {
      sendChat(req.body.engagementId, req.body.body.elementText.text);
    }, customerRespondChatDelay * 1000);
  } else {
    res.sendStatus(200);
  }
};

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

  createCustomerChatWorkFlow("Dermot");

  console.log("Example app listening at http://localhost", host, port);
});
