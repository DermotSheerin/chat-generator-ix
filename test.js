const chatService = require("./services/chat-service");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let chatSentCounter = 0;
let chatSendMax = 5;

const engagementStateMap = new Map();

async function wait(ms) {
    try {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    } catch (err) {
        console.log(`Error in function wait: ${err.message}`);
    }
}

//const chatService = new ChatService("http://10.134.47.235:31380");

// pass in username to this function
async function createChatSession(displayName) {
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

    console.log("Should be waiting on Agent Join now");

    engagementStateMap.set(engagementId, {
        state: "ENGAGED",
        sessionId,
        correlationId,
        dialogId,
    });
}

async function agentJoinReceived(engagementId) {
    updateEngagementState(engagementId, "PARTICIPANT_ADDED");
    console.log("here in agentJoinReceived");
    setTimeout(() => {
        initiateChatSession(engagementId);
    }, 10000);
}

async function agentChatReceived(engagementId, chatReceived) {
    updateEngagementState(engagementId, "Receive_Chat");
    console.log("here in agentChatReceived");
    setTimeout(() => {
        initiateChatSession(engagementId, chatReceived);
    }, 5000);
}

async function initiateChatSession(engagementId, chatMessage) {
    let { sessionId, correlationId, dialogId } = await updateEngagementState(
        engagementId,
        "Send_Chat"
    );

    if (chatSentCounter < chatSendMax) {
        if (!chatMessage) {
            chatMessage = "This is default message sent by nodeJS Generator";
        } else chatMessage = chatMessage;
    } else chatMessage = "###BYE###";

    const response = await chatService.sendChat(
        sessionId,
        engagementId,
        correlationId,
        dialogId,
        chatMessage
    );

    response.status = 200 && chatSentCounter++;
    console.log(chatSentCounter);
}

async function updateEngagementState(engagementId, updateState) {
    let engagementDetails = await engagementStateMap.get(engagementId);
    let { sessionId, correlationId, dialogId } = engagementDetails;

    let state = updateState;

    engagementStateMap.set(engagementId, {
        state,
        sessionId,
        correlationId,
        dialogId,
    });

    return { state, sessionId, correlationId, dialogId };
}

let checkEvent = function (req, res, next)  {
    console.log("Event Received from IX");
    // Listen for Agent Join
    if (
        req.body.eventType === "PARTICIPANT_ADDED" &&
        req.body.participantType === "AGENT"
    ) {
        res.sendStatus(200);
        console.log("Agent Join Received");
        agentJoinReceived(req.body.engagementId);
    } else {
        res.sendStatus(200);
        next('no agent received')
    }
}


app.post("/partAdded", checkEvent);



// Working Latest Aug 5th
// app.post("/partAdded", function (req, res) {
//   // extract engId (equiv to Java Future) -
//   // check for eventTYpe===Participant_Added and participantType=Agent
//   // get promise from agentJoin promise Map
//   // set promise=ready
//   // remove promise from map, continue
//   // use similiar to above when waiting on agent message, create a new Map for this
//   console.log("Event Received from IX");
//   // Listen for Agent Join
//   if (
//     req.body.eventType === "PARTICIPANT_ADDED" &&
//     req.body.participantType === "AGENT"
//   ) {
//     res.sendStatus(200);
//     console.log("Agent Join Received");
//     agentJoinReceived(req.body.engagementId);
//   } else {
//     res.sendStatus(200);
//   }
// });

// app.post("/messages", function (req, res) {
//     // extract engId (equiv to Java Future) -
//     // check for eventTYpe===Participant_Added and participantType=Agent
//     // get promise from agentJoin promise Map
//     // set promise=ready
//     // remove promise from map, continue
//     // use similiar to above when waiting on agent message, create a new Map for this
//     console.log("Event Received from IX");
//     // Listen for Agent Join
//     if (req.body.senderType === "AGENT") {
//         res.sendStatus(200);
//         console.log("Chat Message Received");
//         console.log(`Here is the eventType: ${req.body.eventType}`);
//         console.log(`Here is the senderType: ${req.body.senderType}`);
//         console.log(
//             `Agent Sent this:\n #########   ${req.body.body.elementText.text}   #########`
//         );
//         agentChatReceived(req.body.engagementId, req.body.body.elementText.text);
//     } else {
//         res.sendStatus(200);
//     }
// });

// create waiting on agent join promise
// add promise to agentJoin promise map, key=engId, value=promise
// wait on agent join promise

// const sendChat = await chatService.sendChat(
//   sessionId,
//   engagement.correlationId,
//   engagement.engagementId,
//   engagement.dialogId
// );
// loop send chats, wait for agent response then after last chat send ###BYE### then close the session

// Express - LATEST Aug 2nd
// app.post("/messages", async function (req, res) {
//   // extract engId (equiv to Java Future) -
//   // check for eventTYpe===Participant_Added and participantType=Agent
//   // get promise from agentJoin promise Map
//   // set promise=ready
//   // remove promise from map, continue
//   // use similiar to above when waiting on agent message, create a new Map for this
//   console.log("Event Received from IX");
//   // Listen for Agent Join
//   if (
//     req.body.eventType === "PARTICIPANT_ADDED" &&
//     req.body.participantType === "AGENT" &&
//     req.body.engagementId === engagementId
//   ) {
//     res.sendStatus(200);
//     agentJoinReceived(engagementId);
//     console.log("Agent Join Received");
//   } else {
//     res.sendStatus(200);
//   }
// });

let server = app.listen(3000, function () {
    let host = server.address().address;
    let port = server.address().port;

    // loop 1 to N number of concurrent loops sessions
    // username =John.index
    // createChatSession(add username to function parameters);

    // let i = 1
    // let displayName = "Dermot"
    // while (i < 3) {
    //   createChatSession(displayName + i);
    //   console.log(`Running createChatSession(${displayName + i})`)
    //   i++;
    // }
    createChatSession('Dermot');

    console.log("Example app listening at http://localhost", host, port);
});

// Working code for monitoring events
// if (req.body.participantType === "CUSTOMER") {
//   console.log("Got a POST request IX Digital Chat");
//   console.log(`Here is the eventType: ${req.body.eventType}`);
//   console.log(`Here is the participantType: ${req.body.participantType}`);
//   res.sendStatus(200);
// } else if (req.body.senderType === "AGENT") {
//   console.log("Got a POST request IX Digital Chat");
//   console.log(`Here is the eventType: ${req.body.eventType}`);
//   console.log(`Here is the senderType: ${req.body.senderType}`);
//   console.log(
//       `Agent Sent this:\n #########   ${req.body.body.elementText.text}   #########`
//   );
//   res.sendStatus(200);
// }

// WORKING operator
// app.post("/messages", function (req, res) {
//   req.body.eventType === "PARTICIPANT_ADDED" &&
//   req.body.participantType === "AGENT" &&
//   req.body.engagementId === engagementId
//       ? (res.sendStatus(200),
//           agentJoinReceived(engagementId),
//           console.log("Agent Join Received"))
//       : res.sendStatus(200);
// });
