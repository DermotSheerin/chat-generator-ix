const chatService = require("./services/chat-service");
const chalk = require("chalk");
const timeoutPromise = require("./timeout-promise");
const moment = require("moment");

const port = 8000;
const ip = "135.123.64.37";

// Require Fastify framework and instantiate it
const fastify = require("fastify")({logger: false});
// fastify-cors enables the use of CORS in a Fastify application.
fastify.register(require('fastify-cors'), {
        origin: '*',
        methods: ["POST"]
    }
);

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
let chatSendMax = 2; // NOTE could add random here

// time to wait before customer sends first message (ms)
let firstMsgSendDelay = 5000;

// delay between customer responding to agent chat messages (sec)
let respondMsgDelay = 5000; // NOTE could add random here

// delay between loops (ms)
let delayBetweenLoops = 20000;

// concurrent callers / loop controller
let concurrentCallers = 1;

const customerMsgText = "Here is chat message from Customer";
const customerBye = "###BYE###";

function logMessage(message) {
    const now = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss.SSS");
    console.log(now, message);
}

function errorMessage(message) {
    const now = moment(Date.now()).format("YYYY-MM-DD HH:mm:ss.SSS");
    console.error(now, message);
}

wait = async (ms) => {
    try {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    } catch (err) {
        errorMessage(`Error in function wait: ${err.message}`);
    }
};

// TEMPORARY CODE TO START RUN
//startTest()


async function startTest() {
    // create webHook
    //getWebhook();

    let i = 0;
    let displayName = "Dermot";

    for (i = 0; i < concurrentCallers; i++) {
        createCustomerChatWorkFlow(displayName + i);
        await wait(i * 0.02);
        logMessage(`Running createChatSession - (${displayName + i})`);
    }

    // while (i < concurrentCallers) {
    //   createCustomerChatWorkFlow(displayName + i);
    //   logMessage(`Running createChatSession - (${displayName + i})`);
    //   i++;
    // }
}

async function createCustomerChatWorkFlow(displayName) {
    chatStatsMap["overallCallAttempts"][0]++;

    // create client session - pass in displayName to createSession
    const session = await chatService.createSession(displayName);
    if (!session.success) {
        chatStatsMap["sessionCreate"][1]++;
        return;
    } else {
        chatStatsMap["sessionCreate"][0]++;
        logMessage(`=====> sessionID created: ${session.sessionId}`);
    }

    await wait(2000);

    // create and store Engagement details
    const engagementDetails = await chatService.createEngagement(
        session.sessionId
    );
    if (!engagementDetails.success) {
        chatStatsMap["engageCreate"][1]++;
        return;
    } else chatStatsMap["engageCreate"][0]++;

    // store engagement details in map
    engagementDetailsMap[engagementDetails.engagementId] = {
        sessionId: session.sessionId,
        correlationId: engagementDetails.correlationId,
        dialogId: engagementDetails.dialogId,
        chatCounter: 0,
    };
    logMessage(`=====> engagementID created: ${engagementDetails.engagementId}`);


    // create Promise for agent join
    const promiseAgentJoin = new Promise((resolve) => {
        promiseMap[engagementDetails.engagementId] = resolve;
    });
    logMessage(`Wait for promise to be resolved for agent join, engId: ${engagementDetails.engagementId}`);

    // promise timer for Agent Join
    let agentJoinTimer = await timeoutPromise(agentJoinTimeout, promiseAgentJoin);

    if (!agentJoinTimer) {
        errorMessage(`Agent JOIN Timed out or Agent did not answer in ${agentJoinTimeout} ms !!! for engID: ${engagementDetails.engagementId}, promiseAgentJoin: ${await promiseAgentJoin}, agentJoinTimer returned: ${agentJoinTimer}`);
        chatStatsMap["agtJoin"][1]++;
        return
    }

    // wait before sending a chat message to Agent
    await wait(firstMsgSendDelay);

    // send chat loop
    let chatCounter = engagementDetailsMap[engagementDetails.engagementId].chatCounter;
    while (chatCounter < chatSendMax) {
        await sendChat(engagementDetails.engagementId, customerMsgText);
        await waitForAgentMsgPromise(engagementDetails.engagementId);
        chatCounter++;
    }

    // send BYE to Agent when chatSendMax is reached
    logMessage(`Customer about to send bye, engID: ${engagementDetails.engagementId}`)
    await sendChat(engagementDetails.engagementId, customerBye);
    chatStatsMap["interactEnd"][0]++;
    logMessage(chalk.green(`Agent Terminated successfully engId: ${engagementDetails.engagementId} chatStats: ${Object.entries(chatStatsMap)}`));


    // logMessage(`Customer terminate call, engID: ${engagementDetails.engagementId} and participant: ${displayName}`)
    // await chatService.disconnectEngagement(
    //     engagementDetails.engagementId,
    //     engagementDetails.sessionId,
    //     engagementDetails.dialogId,
    //     displayName
    // )
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
            logMessage(`=====> webHookId created: ${webhookId}`);
        }
    } else {
        logMessage(`Webhook already exists: ${webhookId}`);
    }
}

// create Promise to wait for Message Received from Agent
async function waitForAgentMsgPromise(engagementId) {
    const promiseMessageReceived = new Promise((resolve) => {
        promiseMap[engagementId] = resolve;
    });
    logMessage(`Wait for Agent MESSAGE`);
    let awaitMessageReceived = await promiseMessageReceived;
    logMessage(`Agent Message has been Received:  ${awaitMessageReceived} engId: ${engagementId}`);
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
    logMessage(`Agent Join Received for engId: ${engagementId} `);

    // verify the engagementID is stored in the promiseMap before attempting to resolve
    if (promiseMap[engagementId]) {
        chatStatsMap["agtJoin"][0]++;
        logMessage(`Engagement ID IS contained within the promiseMap: ${engagementId}`);

        // access the resolve function inside the promiseMap and pass in true to resolve function for promiseAgentJoin
        promiseMap[engagementId](true);
        logMessage(`============> Agent Join Promise has been resolved and set to true`);

        // deleting the engID from the map due to duplicate JOINS being sent from IX
        delete promiseMap[engagementId];
    }
}

function processAgentSendMsgEvent(engagementId) {
    // if engId is in promiseMap then resolve the promise and increment the chatStats
    if (promiseMap[engagementId]) {
        (promiseMap[engagementId](true));
        chatStatsMap["receiveChat"][0]++;
    }
}

function processAgentDisconnectEvent(engagementId) {
    // deleting the engID from the map due to duplicate TERMINATES being sent from IX
    if (promiseMap[engagementId]) {
        delete promiseMap[engagementId];
        chatStatsMap["interactEnd"][0]++;
        logMessage(`Agent Terminated successfully engId: ${engagementId} chatStats: ${Object.entries(chatStatsMap)}`);
    }

    // TEMP CODE TO RESTART LOOP
    // startLoop
    //   ? (wait(delayBetweenLoops),
    //     createCustomerChatWorkFlow("Start-Test-Inside-Loop"))
    //   : (chatService.deleteWebHook(webhookId),
    //     logMessage(`######## Stopping Test ########`)));
}

allEvents = (request, reply) => {
    // Listen for Agent Join
    if (request.body.eventType === "PARTICIPANT_ADDED" && request.body.participantType === "AGENT") {
        reply.code(200);
        processAgentJoinEvent(request.body.engagementId);
    }

    // Listen for Agent Send Message
    else if (request.body.senderType === "AGENT") {
        reply.code(200);

        // after predefined delay respond to Agent message
        setTimeout(() => {
            processAgentSendMsgEvent(request.body.engagementId);
        }, respondMsgDelay);
    }

    // Listen for Participant Disconnect
    else if (request.body.eventType === "PARTICIPANT_DISCONNECTED") {
        reply.code(200);
        processAgentDisconnectEvent(request.body.engagementId);
    } else {
        reply.code(200);
    }
};

// fastify.get('/joey', (req, reply) => {
//     reply.send("HHHHHHHHHHHHHHHHHHH")
// })


fastify.post("/allEvents", allEvents);

// set Chat Parameters
fastify.post("/changeChatParameters", (request, reply) => {
    reply.code(200);
    concurrentCallers = request.body.concurrentCallers;
    chatSendMax = request.body.chatSendMax;
    firstMsgSendDelay = request.body.firstMsgSendDelay;
    respondMsgDelay = request.body.respondMsgDelay;
    delayBetweenLoops = request.body.delayBetweenLoops;
    agentJoinTimeout = request.body.agentJoinTimeout;
});

// retrieve Chat Parameters
fastify.get("/getChatParameters", (request, reply) => {
    reply.send({
        concurrentCallers: concurrentCallers,
        chatSendMax: chatSendMax,
        firstMsgSendDelay: firstMsgSendDelay,
        respondMsgDelay: respondMsgDelay,
        delayBetweenLoops: delayBetweenLoops,
        agentJoinTimeout: agentJoinTimeout,
    });
});

// GET to retrieve the chatStatsMap details
fastify.get("/getStats", (request, reply) => {
    reply.send(chatStatsMap);
});

//GET to stop test gradually
fastify.get("/stopTest", (request, reply) => {
    startLoop = false;
    reply.send(`******** Test will terminate gracefully ********`);
});

//GET to start test
fastify.get("/startTest", (request, reply) => {
    //startLoop = true;
    startTest();
    logMessage(chalk.green("###### Chat Generator Started ######"));
    reply.send(`******** Test Starting ********`);
});

// toggle test start/stop
// app.post("/genStartStop/:testStart", (req, res) => {
//   req.params.testStart === "true" ? (startLoop = true, startTest(), logMessage(chalk.green("###### Chat Generator Started ######")),
//   res.send(`******** Test Starting ********`))
//   :
//   (startLoop = false, logMessage(chalk.green("******** Test will terminate gracefully ********"), res.send(`******** Test will terminate gracefully ********`)))
// })

// GET request to trigger chat generator to start
// app.get("/startGen", (req, res) => {
//   createCustomerChatWorkFlow('Post-Start-Test')
//   res.send("******** createCustomerChatWorkFlow Triggered Manually ********")
// })

// Run the server!
fastify.listen(port, ip, (err, address) => {
    if (err) {
        fastify.log.error(err)
        process.exit(1)
    }
    logMessage(`Fastify listening on: ${ip}:${port}`);
})



