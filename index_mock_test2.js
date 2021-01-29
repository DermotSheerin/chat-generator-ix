const chatService = require("./services/chat-service");
const chalk = require("chalk");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
const timeoutPromise = require("./timeout-promise");

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json(), cors());

const port = 8000;

const promiseMap = {};
const engagementDetailsMap = {};

// initial chat stat values
let chatStatsMap = {
    overallCallAttempts: [0, 0],
    webHookCreate: [0, 0],
    sessionCreate: [0, 0],
    engageCreate: [0, 0],
    agtJoin: [0, 0],
    sendChat: [0, 0],
    receiveChat: [0, 0],
    interactEnd: [0, 0],
};

let webhookId = "";

// stop Loop using express server request
let startLoop = false;

// agent JOIN timeout value (ms)
let agentJoinTimeout = 20000;

// max messages each user will send
let chatSendMax = 3; // NOTE could add random here

// time to wait before customer sends first message (ms)
let firstMsgSendDelay = 5000;

// delay between customer responding to agent chat messages (sec)
let respondMsgDelay = 5000; // NOTE could add random here

// delay between loops (ms)
let delayBetweenLoops = 20000;

// concurrent callers / loop controller
let concurrentCallers = 1;

let agentSendsBye = true;

const customerMsgText = "Here is chat message from Customer";
const customerBye = "###BYE###";

wait = async (ms) => {
    try {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    } catch (err) {
        console.log(`Error in function wait: ${err.message}`);
    }
};

async function startTest() {
    // create webHook
    //getWebhook();

    let i;
    let displayName = "Dermot";

    console.log('startTest: ' + new Date().toISOString().substr(11, 8))


        for (i = 0; i < concurrentCallers; i++) {
            createCustomerChatWorkFlow(displayName + i);
            //await wait(i * 0.02);
            await wait(10);
            console.log(`Running createChatSession - (${displayName + i})`);
        }

    console.log(chalk.green(`End of Test: ${new Date().toISOString().substr(11, 8)}`))

}

async function createCustomerChatWorkFlow(displayName) {
    chatStatsMap["overallCallAttempts"][0]++;

    // pass in userName to createSession
    const session = await chatService.createSession(displayName);
    if (!session.success) {
        chatStatsMap["sessionCreate"][1]++;
        return;
    } else {
        chatStatsMap["sessionCreate"][0]++;
        console.log(`=====> sessionID created: ${session.sessionId}`);
    }

    await wait(2000);

    // create and store Engagement details
    const engagementDetails = await chatService.createEngagement(
        session.sessionId
    );
    if (!engagementDetails.success) {
        chatStatsMap["engageCreate"][1]++;
        //return;
    } else chatStatsMap["engageCreate"][0]++;

    // retrieve participant ID for the engagement
    const participantId = await chatService.getParticipantId(
        engagementDetails.engagementId
    );
    if (!participantId.success) {
        //chatStatsMap["engageCreate"][1]++;
        return;
    }

    console.log(`Here is participantId: ${participantId.participantId}`)

    // store engagement details in map
    engagementDetailsMap[engagementDetails.engagementId] = {
        sessionId: engagementDetails.sessionId,
        correlationId: engagementDetails.correlationId,
        dialogId: engagementDetails.dialogId,
        participantId: participantId,
        chatCounter: 0,
    };
    console.log(`=====> engagementID created: ${engagementDetails.engagementId}`);

    /////////////////////////// create Promise for agent join
    const promiseAgentJoin = new Promise((resolve) => { promiseMap[engagementDetails.engagementId] = resolve; });
    console.log(`Wait for promise to be resolved in express message handler for agent join, engId: ${engagementDetails.engagementId}`);

    // promise timer for Agent Join
    let agentJoinTimer = await timeoutPromise(agentJoinTimeout, promiseAgentJoin);

    if (!agentJoinTimer) {
        console.log( chalk.red(`Agent JOIN Timed out or Agent did not answer in ${agentJoinTimeout} ms !!! for engID: ${ engagementDetails.engagementId }, promiseAgentJoin: ${await promiseAgentJoin}`));
        chatStatsMap["agtJoin"][1]++;
    }

    //console.log(`here is promiseAgentJoin value: ${await promiseAgentJoin}`);

    // wait before sending a chat message to Agent
    await wait(firstMsgSendDelay);

    /////////////////////////// Send Chat Loop
    while ( engagementDetailsMap[engagementDetails.engagementId].chatCounter < chatSendMax ) {
        await sendChat(engagementDetails.engagementId, customerMsgText);
        await waitForAgentMsgPromise(engagementDetails.engagementId);
        engagementDetailsMap[engagementDetails.engagementId].chatCounter++;
    }

    // determine whether agent or customer sends bye
    if (agentSendsBye) {
        // send BYE to Agent when chatSendMax is reached
        await sendChat(engagementDetails.engagementId, customerBye);
    } else {
        // disconnect engagement from customer
        const disconnectEngagement = await chatService.disconnectEngagement(engagementDetails.engagementId, engagementDetails.sessionId, engagementDetails.dialogId, engagementDetails.participantId);
        if (!disconnectEngagement.success) {
            return;
        } else console.log(chalk.green(`Disconnect Engagement Success: ${disconnectEngagement.success}`));

        // terminate session from customer
        const terminateSession = await chatService.terminateSession(engagementDetails.sessionId);
        if (!terminateSession.success) {
            chatStatsMap["interactEnd"][1]++;
        } else {
            chatStatsMap["interactEnd"][0]++;
            console.log(chalk.green(`Terminate Session Success: ${disconnectEngagement.success}`));
        }
    }
}

async function getWebhook() {
    // create a new webhook and store as global variable on start up
    if (!webhookId) {
        const webhook = await chatService.createWebHook();
        if (!webhook.success) {
            chatStatsMap["webHookCreate"][1]++;
        } else {
            webhookId = webhook.webhookId;
            chatStatsMap["webHookCreate"][0]++;
            console.log(`=====> webHookId created: ${webhookId}`);
        }
    } else {
        console.log(`Webhook already exists: ${webhookId}`);
    }
}

// create Promise to wait for Message Received from Agent
async function waitForAgentMsgPromise(engagementId) {
    const promiseMessageReceived = new Promise((resolve) => { promiseMap[engagementId] = resolve; });
    console.log(`Wait for promise to be resolved in express message handler for MESSAGE RECEIVED`);
    let awaitMessageReceived = await promiseMessageReceived;
    console.log(`Message has been Received:  ${awaitMessageReceived} engId: ${engagementId}`);
}

async function sendChat(engagementId, customerMsgText) {
    // retrieve engagement details from engagementDetailsMap
    const engagementDetails = engagementDetailsMap[engagementId];

    const sendChat = await chatService.sendChat(
        engagementDetails.sessionId,
        engagementId,
        engagementDetails.correlationId,
        engagementDetails.dialogId,
        customerMsgText
    );

    if (!sendChat.success) {
        chatStatsMap["sendChat"][1]++;
    } else chatStatsMap["sendChat"][0]++;
}

function processAgentJoinEvent(engagementId) {
    console.log(`Agent Join Received for engId: ${engagementId} `);

    // verify the engagementID is stored in the promiseMap before attempting to resolve
    if (promiseMap[engagementId]) {
        chatStatsMap["agtJoin"][0]++;
        console.log(`Engagement ID IS contained within the promiseMap: ${engagementId}`);

        // access the resolve function inside the promiseMap and pass in true to resolve function for promiseAgentJoin
        promiseMap[engagementId](true);
        console.log(`============> Agent Join Promise has been resolved and set to true`);

        // deleting the engID from the map due to duplicate JOINS being sent from IX
        delete promiseMap[engagementId];
    }
}

function processAgentSendMsgEvent(engagementId) {
    // if engId is in promiseMap then resolve the promise and increment the chatStats
    promiseMap[engagementId] && (promiseMap[engagementId](true), chatStatsMap["receiveChat"][0]++);
}

function processAgentDisconnectEvent(engagementId) {
    // deleting the engID from the map due to duplicate TERMINATES being sent from IX
    if (promiseMap[engagementId]) {
        delete promiseMap[engagementId];
        chatStatsMap["interactEnd"][0]++;
        console.log(chalk.green(`Agent Terminated successfully engId: ${engagementId} chatStats: ${Object.entries(chatStatsMap)}`));
    }

    // TEMP CODE TO RESTART LOOP
    // startLoop
    //   ? (wait(delayBetweenLoops),
    //     createCustomerChatWorkFlow("Start-Test-Inside-Loop"))
    //   : (chatService.deleteWebHook(webhookId),
    //     console.log(chalk.green(`######## Stopping Test ########`))));
}

allEvents = (req, res) => {
    // Listen for Agent Join
    if (req.body.eventType === "PARTICIPANT_ADDED" && req.body.participantType === "AGENT") {
        res.sendStatus(200);
        processAgentJoinEvent(req.body.engagementId);
    }

    // Listen for Agent Send Message
    else if (req.body.senderType === "AGENT") {
        res.sendStatus(200);

        // after predefined delay respond to Agent message
        setTimeout(() => {
            processAgentSendMsgEvent(req.body.engagementId);
        }, respondMsgDelay);
    }

    // Listen for Participant Disconnect
    else if (req.body.eventType === "PARTICIPANT_DISCONNECTED") {
        res.sendStatus(200);
        processAgentDisconnectEvent(req.body.engagementId);
    } else {
        res.sendStatus(200);
    }
};

app.post("/allEvents", allEvents);

// set Chat Parameters
app.post("/changeChatParameters", (req, res) => {
    res.sendStatus(200);
    concurrentCallers = req.body.concurrentCallers;
    chatSendMax = req.body.chatSendMax;
    firstMsgSendDelay = req.body.firstMsgSendDelay;
    respondMsgDelay = req.body.respondMsgDelay;
    delayBetweenLoops = req.body.delayBetweenLoops;
    agentJoinTimeout = req.body.agentJoinTimeout;
    agentSendsBye = req.body.agentSendsBye;
});

// retrieve Chat Parameters
app.get("/getChatParameters", (req, res) => {
    res.send({
        concurrentCallers: concurrentCallers,
        chatSendMax: chatSendMax,
        firstMsgSendDelay: firstMsgSendDelay,
        respondMsgDelay: respondMsgDelay,
        delayBetweenLoops: delayBetweenLoops,
        agentJoinTimeout: agentJoinTimeout,
        agentSendsBye: agentSendsBye
    });
});

// GET to retrieve the chatStatsMap details
app.get("/getStats", (req, res) => {
    res.send(chatStatsMap);
});

//GET to stop test gradually
app.get("/stopTest", (req, res) => {
    startLoop = false;
    res.send(`******** Test will terminate gracefully ********`);
});

//GET to start test
app.get("/startTest", (req, res) => {
    //startLoop = true;
    startTest();
    console.log(chalk.green("###### Chat Generator Started ######"));
    res.send(`******** Test Starting ********`);
});

// toggle test start/stop
// app.post("/genStartStop/:testStart", (req, res) => {
//   req.params.testStart === "true" ? (startLoop = true, startTest(), console.log(chalk.green("###### Chat Generator Started ######")),
//   res.send(`******** Test Starting ********`))
//   :
//   (startLoop = false, console.log(chalk.green("******** Test will terminate gracefully ********"), res.send(`******** Test will terminate gracefully ********`)))
// })

// GET request to trigger chat generator to start
// app.get("/startGen", (req, res) => {
//   createCustomerChatWorkFlow('Post-Start-Test')
//   res.send("******** createCustomerChatWorkFlow Triggered Manually ********")
// })

let server = app.listen(port, function () {
    let host = server.address().address;
    //let port = server.address().port;


    console.log("Example app listening at http://localhost", host, port);
});


