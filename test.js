const chatService = require("./services/chat-service");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

let chatSentCounter = 0;
let chatSendMax = 10;

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

// pass in username to this function
async function createChatSession(displayName) {
    let sessionId;
    let correlationId;
    let engagementId;
    let dialogId;

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

app.post("/partAdded", function (req, res) {
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
    }
});

app.post("/messages", function (req, res) {
    console.log("Event Received from IX");
    if (req.body.senderType === "AGENT") {
        res.sendStatus(200);
        console.log("Chat Message Received");
        console.log(`Here is the eventType: ${req.body.eventType}`);
        console.log(`Here is the senderType: ${req.body.senderType}`);
        console.log(
            `Agent Sent this:\n #########   ${req.body.body.elementText.text}   #########`
        );
        agentChatReceived(req.body.engagementId, req.body.body.elementText.text); // pass in eng ID and text received from agent
    } else {
        res.sendStatus(200);
    }
});


let server = app.listen(3000, function () {
    let host = server.address().address;
    let port = server.address().port;

    let i = 1
    let displayName = "Dermot"
    while (i < 3) {
        createChatSession(displayName + i);
        console.log(`Running createChatSession(${displayName + i})`)
        i++;
    }
    //createChatSession();

    console.log("Example app listening at http://localhost", host, port);
});

