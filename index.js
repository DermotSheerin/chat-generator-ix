const chatService = require("./services/chat-service");
const chalk = require("chalk");
const timeoutPromise = require("./utilities/timeout-promise");
const { logMessage, errorMessage } = require("./logger/logger");

// for Express framework import the following module
//let { server, framework, resetEventCounter } = require("./routes/index").server;

for Fastify framework import the following module
let {
  server,
  framework,
  resetEventCounter,
} = require("./routes/indexFastify").server;

const utils = require("./utilities/utils.js");

const port = 8001;
const ip = "0.0.0.0";

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

const resetChatStats = () => {
  // iterate chatStatsMap to retrieve the value (array) that contains the stats for pass/fail and reset to 0
  for (const [key, value] of Object.entries(chatStatsMap)) {
    value.forEach((stat, index) => {
      // reset each statistic to 0
      value[index] = 0;
    });
  }
  // reset event count to 0
  resetEventCounter();
};

let webhookId = "";

const chatParameters = {
  framework: framework,
  stopTest: false,
  startTime: "",
  stopTime: "",
  agentJoinTimeout: 20000,
  chatSendMax: 2,
  firstMsgSendDelay: 5000,
  respondMsgDelay: 5000,
  // delayBetweenLoops: 20000,
  concurrentCallers: 1,
};

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

const startTest = async () => {
  // create webHook
  //getWebhook();

  let i = 0;
  let displayName = "Dermot";
  chatParameters.stopTest = false;
  chatParameters.startTime = utils.currentTime();

  for (i = 0; i < chatParameters.concurrentCallers; i++) {
    if (chatParameters.stopTest) {
      logMessage(`******** Test will terminate gracefully ********`);
      chatParameters.stopTime = utils.currentTime();
      break;
    }
    createCustomerChatWorkFlow(displayName + i);
    await wait(i * 0.02);
    logMessage(
      `Running createChatSession - (${displayName + i} and concurrentCallers: ${
        chatParameters.concurrentCallers
      })`
    );
  }
  chatParameters.stopTime = utils.currentTime();
};

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
    displayName: displayName,
    sessionId: session.sessionId,
    correlationId: engagementDetails.correlationId,
    dialogId: engagementDetails.dialogId,
    chatCounter: 0,
  };
  logMessage(`=====> engagementID created: ${engagementDetails.engagementId}`);

  // create Promise for agent join
  // const promiseAgentJoin = new Promise((resolve) => {
  //     promiseMap[engagementDetails.engagementId] = resolve;
  // });
  logMessage(
    `Wait for promise to be resolved for agent join, engId: ${engagementDetails.engagementId}`
  );

  // promise timer for Agent Join
  //let agentJoinTimer = await timeoutPromise(chatParameters.agentJoinTimeout, promiseAgentJoin);

  // timeoutPromise performs a races between 2 promises i.e., how long it takes an agent to join and the timeout for an agent join set by the user
  engagementDetailsMap[
    engagementDetails.engagementId
  ].agentJoinTimer = await timeoutPromise(
    chatParameters.agentJoinTimeout,
    new Promise((resolve) => {
      promiseMap[engagementDetails.engagementId] = resolve;
    })
  );

  //console.log(`agentJoinTimer is ${engagementDetailsMap[engagementDetails.engagementId].agentJoinTimer} and agt join promiseMap: ${promiseMap[engagementDetails.engagementId]}`);

  // if the agent fails to answer within the timeout for agent join then mark this as failed and exit the test
  if (!engagementDetailsMap[engagementDetails.engagementId].agentJoinTimer) {
    // errorMessage(`Agent JOIN Timed out or Agent did not answer in ${chatParameters.agentJoinTimeout} ms !!! for engID: ${engagementDetails.engagementId}, promiseAgentJoin: ${await promiseAgentJoin}, agentJoinTimer returned: ${agentJoinTimer}`);
    errorMessage(
      `Agent JOIN Timed out or Agent did not answer in ${
        chatParameters.agentJoinTimeout
      } ms !!! for engID: ${
        engagementDetails.engagementId
      }, agentJoinTimer returned: ${
        engagementDetailsMap[engagementDetails.engagementId].agentJoinTimer
      }`
    );
    chatStatsMap["agtJoin"][1]++;
    return;
  }

  // wait before sending a chat message to Agent
  await wait(chatParameters.firstMsgSendDelay);

  // send chat loop
  let chatCounter =
    engagementDetailsMap[engagementDetails.engagementId].chatCounter;
  while (chatCounter < chatParameters.chatSendMax) {
    await sendChat(engagementDetails.engagementId, customerMsgText);
    await waitForAgentMsgPromise(engagementDetails.engagementId);
    chatCounter++;
    await wait(chatParameters.respondMsgDelay);
  }

  // send BYE to Agent when chatSendMax is reached to terminate interaction from client side
  logMessage(
    `Customer about to send bye, engID: ${engagementDetails.engagementId}`
  );
  const response = await sendChat(engagementDetails.engagementId, customerBye);
  if (response) chatStatsMap["interactEnd"][0]++;
  logMessage(
    chalk.green(
      `Agent Terminated successfully engId: ${
        engagementDetails.engagementId
      } chatStats: ${Object.entries(chatStatsMap)}`
    )
  );

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
  logMessage(
    `Agent Message has been Received:  ${awaitMessageReceived} engId: ${engagementId}`
  );
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
  } else {
    logMessage(
      `Customer ${engagementDetails.displayName} sent message success`
    );
    chatStatsMap["sendChat"][0]++;
  }
  return sendChat.success;
}

const processAgentJoinEvent = (engagementId) => {
  logMessage(`Agent Join Received for engId: ${engagementId}`);

  // verify the engagementID is stored in the promiseMap before attempting to resolve
  // check that agent join timer has not expired i.e., equals false
  if (
    promiseMap[engagementId] &&
    engagementDetailsMap[engagementId].agentJoinTimer !== false
  ) {
    chatStatsMap["agtJoin"][0]++;
    logMessage(
      `Engagement ID IS contained within the promiseMap: ${engagementId}`
    );

    // access the resolve function inside the promiseMap and pass in true to resolve function for promiseAgentJoin
    promiseMap[engagementId](true);
    logMessage(
      `============> Agent Join Promise has been resolved and set to true`
    );
  }
  // deleting the engID from the map
  delete promiseMap[engagementId];
};

const processAgentSendMsgEvent = (engagementId) => {
  // if engId is in promiseMap then resolve the promise and increment the chatStats
  if (promiseMap[engagementId]) {
    promiseMap[engagementId](true);
    chatStatsMap["receiveChat"][0]++;
  }
};

// if terminate interaction is initiated by Agent
const processAgentDisconnectEvent = (engagementId) => {
  // deleting the engID from the map due to duplicate TERMINATES being sent from IX
  if (promiseMap[engagementId]) {
    delete promiseMap[engagementId];
    chatStatsMap["interactEnd"][0]++;
    logMessage(
      `Agent Terminated successfully engId: ${engagementId} chatStats: ${Object.entries(
        chatStatsMap
      )}`
    );
  }

  // TEMP CODE TO RESTART LOOP
  // startLoop
  //   ? (wait(delayBetweenLoops),
  //     createCustomerChatWorkFlow("Start-Test-Inside-Loop"))
  //   : (chatService.deleteWebHook(webhookId),
  //     logMessage(`######## Stopping Test ########`)));
};

exports.chatParameters = chatParameters;
exports.chatStatsMap = chatStatsMap;
exports.resetChatStats = resetChatStats;
exports.startTest = startTest;
exports.processAgentJoinEvent = processAgentJoinEvent;
exports.processAgentSendMsgEvent = processAgentSendMsgEvent;
exports.processAgentDisconnectEvent = processAgentDisconnectEvent;
exports.ip = ip;
exports.port = port;

server.listen(port, ip, () =>
  logMessage(`Listening on IP: ${ip}: port ${port}`)
);
