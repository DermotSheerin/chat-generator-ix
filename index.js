const chatService = require("./services/chat-service");
const chalk = require("chalk");
const timeoutPromise = require("./timeout-promise");
const { logMessage, errorMessage } = require("./logger/logger");
const server = require("./routes/index").server;

const port = 8000;
const ip = "10.134.45.26";


const promiseMap = {};
const engagementDetailsMap = {};


// initial chat stat values
const chatStatsMap = {
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

const chatParameters = {
    startLoop: false,
    agentJoinTimeout: 20000,
    chatSendMax: 2,
    firstMsgSendDelay: 5000,
    respondMsgDelay: 5000,
    delayBetweenLoops: 20000,
    concurrentCallers: 1
}

const customerMsgText = "Here is chat message from Customer";
const customerBye = "###BYE###";


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


const startTest = async () => {
    // create webHook
    //getWebhook();

    let i = 0;
    let displayName = "Dermot";

    for (i = 0; i < chatParameters.concurrentCallers; i++) {
        createCustomerChatWorkFlow(displayName + i);
        await wait(i * 0.02);
        logMessage(`Running createChatSession - (${displayName + i} and concurrentCallers: ${chatParameters.concurrentCallers})`);
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
    let agentJoinTimer = await timeoutPromise(chatParameters.agentJoinTimeout, promiseAgentJoin);

    if (!agentJoinTimer) {
        errorMessage(`Agent JOIN Timed out or Agent did not answer in ${chatParameters.agentJoinTimeout} ms !!! for engID: ${engagementDetails.engagementId}, promiseAgentJoin: ${await promiseAgentJoin}, agentJoinTimer returned: ${agentJoinTimer}`);
        chatStatsMap["agtJoin"][1]++;
        return
    }

    // wait before sending a chat message to Agent
    await wait(chatParameters.firstMsgSendDelay);

    // send chat loop
    let chatCounter = engagementDetailsMap[engagementDetails.engagementId].chatCounter;
    while (chatCounter < chatParameters.chatSendMax) {
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

const processAgentJoinEvent = (engagementId) => {
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

const processAgentSendMsgEvent = (engagementId) => {
    // if engId is in promiseMap then resolve the promise and increment the chatStats
    if (promiseMap[engagementId]) {
        (promiseMap[engagementId](true));
        chatStatsMap["receiveChat"][0]++;
    }
}

const processAgentDisconnectEvent = (engagementId) => {
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

exports.chatParameters = chatParameters;
exports.chatStatsMap = chatStatsMap;
exports.startTest = startTest;
exports.processAgentJoinEvent = processAgentJoinEvent;
exports.processAgentSendMsgEvent = processAgentSendMsgEvent;
exports.processAgentDisconnectEvent = processAgentDisconnectEvent;

server.listen(port, ip,() => logMessage(`Listening on IP: ${ip}: port ${port}`));