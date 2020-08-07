const chatService = require("./services/chat-service");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

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
setupChatEngagement = async (displayName) => {
  let sessionId;
  let correlationId;
  let engagementId;
  let dialogId;

  // try catch - inside try increment success, catch increment fail and report exception
  //const webHook = await chatService.createWebHook();

  // pass in userName to createSession
  sessionId = await chatService.createSession(displayName);
  console.log("=====> here is sessionID in LOOP: " + sessionId);

  await wait(2000);

  const engagement = await chatService.createEngagement(sessionId);
  engagementId = engagement.engagementId;
  correlationId = engagement.correlationId;
  dialogId = engagement.dialogId;


  console.log("Should be waiting on Agent Join now: " + chatCounter);

  // store session and state details in engagement MAP
  engagementStateMap.set(engagementId, {
    state: "ENGAGED",
    sessionId,
    correlationId,
    dialogId
  });

  // store chatCounter in chatCounter MAP
  chatCounterMap.set(engagementId, chatCounter);
}

agentJoinReceived = (engagementId) => {
  // update Engagement MAP with new state
  updateEngagementState(engagementId, "PARTICIPANT_ADDED");
  console.log("here in agentJoinReceived");

  // initiate chat conversation after specified time
  setTimeout(() => {
    initiateChatSession(engagementId);
  }, initialMessageSend);
}

agentChatReceived = (engagementId, chatReceived) => {
  // update Engagement MAP with new state
  updateEngagementState(engagementId, "Receive_Chat");
  console.log("here in agentChatReceived");

  // initiate chat conversation after specified time
  setTimeout(() => {
    initiateChatSession(engagementId, chatReceived);
  }, messageSendDelay);
}

initiateChatSession = async (engagementId, chatMessage) => {
  // update Engagement MAP with new state and retrieve session details
  let { sessionId, correlationId, dialogId } = updateEngagementState(
    engagementId,
    "Send_Chat"
  );

  // retrieve chatCounter value from MAP
  chatCounter = chatCounterMap.get(engagementId);

  if (chatCounter < chatSendMax) {
    if (!chatMessage) {
      chatMessage = "This is default message sent by nodeJS Generator";
      chatCounter ++;
    } else  chatCounter ++; // increment counter and echo back message sent by agent
  } else  {
    console.log(`Here is chatCounter before BYE ${chatCounter}`);
    chatMessage = "###BYE###";
    chatCounterMap.set(engagementId, 0);
    setTimeout(() => {
      setupChatEngagement('Dermot');
    }, 20000);
  }

  const response = await chatService.sendChat(
    sessionId,
    engagementId,
    correlationId,
    dialogId,
    chatMessage
  );

  // if chat was sent successfully, update the counter in chatCounter MAP
  response.status = 200 && chatCounterMap.set(engagementId, chatCounter);
  console.log(`Here is latest chatCounterMAP value: ${chatCounterMap.get(engagementId)}`);
}

updateEngagementState = (engagementId, updateState) => {
  let engagementDetails = engagementStateMap.get(engagementId);
  let { sessionId, correlationId, dialogId } = engagementDetails;

  let state = updateState;

  engagementStateMap.set(engagementId, {
    state,
    sessionId,
    correlationId,
    dialogId
  });

  return { state, sessionId, correlationId, dialogId };
}



// //call participantAddedEvent function when PARTICIPANT_ADDED event received for AGENT
// participantAddedEvent = (req, res) => {
//   console.log(`Event Received from IX to /partAdded: ${req.body.eventType} and partType: ${req.body.participantType}`);
//   // Listen for Agent Join
//   if (
//       req.body.eventType === "PARTICIPANT_ADDED" &&
//       req.body.participantType === "AGENT"
//   ) {
//     res.sendStatus(200);
//     console.log("Agent Join Received");
//     agentJoinReceived(req.body.engagementId);
//   } else {
//     res.sendStatus(200);
//   }
// }
//
// // call messageReceivedEvent function when MESSAGES are received from AGENT
// messageReceivedEvent = (req, res,) => {
//   console.log(`Event Received from IX to /messages: ${req.body.eventType} and partType: ${req.body.participantType}`);
//   // Listen for Messages Received
//   if (req.body.senderType === "AGENT") {
//     res.sendStatus(200);
//     console.log("Chat Message Received");
//     console.log(`Here is the eventType: ${req.body.eventType}`);
//     console.log(`Here is the senderType: ${req.body.senderType}`);
//     console.log(
//         `Agent Sent this:\n #########   ${req.body.body.elementText.text}   #########`
//     );
//     agentChatReceived(req.body.engagementId, req.body.body.elementText.text);
//   } else {
//     res.sendStatus(200);
//   }
// }

allEvents = (req, res) => {
  console.log(`Event Received from IX to /partAdded: ${req.body.eventType} and partType: ${req.body.participantType}`);
  // Listen for Agent Join
  if (
      req.body.eventType === "PARTICIPANT_ADDED" &&
      req.body.participantType === "AGENT"
  ) {
    res.sendStatus(200);
    console.log("Agent Join Received");
    agentJoinReceived(req.body.engagementId);
  } else if (req.body.senderType === "AGENT") {
    res.sendStatus(200);
    console.log("Chat Message Received");
    console.log(`Here is the eventType: ${req.body.eventType}`);
    console.log(`Here is the senderType: ${req.body.senderType}`);
    console.log(
        `Agent Sent this:\n #########   ${req.body.body.elementText.text}   #########`
    );
    agentChatReceived(req.body.engagementId, req.body.body.elementText.text);
  } else {
    res.sendStatus(200);
  }
}


app.post("/allEvents", allEvents);

// app.post("/partAdded", participantAddedEvent);
//
// app.post("/messages", messageReceivedEvent);

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
  setupChatEngagement('Dermot');

  console.log("Example app listening at http://localhost", host, port);
});

