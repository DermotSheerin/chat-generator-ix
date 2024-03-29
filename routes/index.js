const index = require("../index.js");
const { logMessage } = require("../logger/logger");
const express = require("express");
const chalk = require("chalk");
const http = require("http");
const socketIo = require("socket.io");
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json(), cors());
let interval;
let maxValues;
let eventCounter = 0;
const framework = "Express";

const utils = require("../utilities/utils.js");

// reuse the HTTP server to run socket.io within the same HTTP server instance
const server = http.createServer(app);

//  call to socketIo() to initialize a new instance by passing in the server object and set origins
//  option on the server side to allow cross-origin requests
const io = socketIo(server, {
  cors: {
    origin: "*",
  },
});

// using setInterval to emit the chatStats object every second
// Socket.IO on() takes two arguments: the name of the event, in this case "connection",
// and a callback which will be executed after every connection event. The connection event returns a socket object which will
// be passed to the callback function. By using said socket you will be able to send data back to a client in real time.

// listen for socket connection with 'io.on'
io.on("connection", (socket) => {
  logMessage("New client connected");
  if (interval) {
    clearInterval(interval);
  }
  interval = setInterval(() => getChatStats(socket), 1000);

  // clearing the interval on any new connection, and on disconnection to avoid flooding the server
  socket.on("disconnect", () => {
    logMessage("Client disconnected");
    clearInterval(interval);
  });
});

const getChatStats = (socket) => {
  // Emitting a new message. Will be consumed by the client
  const usedMem = utils.usedMem();
  const cpuTime = utils.cpuTime();

  maxValues = utils.getMaxValues(usedMem, cpuTime.userTime, cpuTime.systemTime);

  socket.emit("FromAPI", {
    chatStatsMap: index.chatStatsMap,
    eventCounter: eventCounter,
    testTime: {
      startTime: index.chatParameters.startTime,
      stopTime: index.chatParameters.stopTime,
    },
    graphData: {
      time: utils.currentTime(),
      usedMem: usedMem,
      userTime: cpuTime.userTime,
      systemTime: cpuTime.systemTime,
    },
    resourceStats: {
      usedMem: [`${usedMem} MB`, maxValues.maxMem],
      userTime: [`${cpuTime.userTime} secs`, maxValues.maxUserTime],
      systemTime: [`${cpuTime.systemTime} secs`, maxValues.maxSystemTime],
    },
  });
};

const resetEventCounter = () => {
  eventCounter = 0;
};

app.post("/allEvents", (req, res) => {
  // increment event counter to track number of events received
  eventCounter++;
  // Listen for Agent Join
  if (
    req.body.eventType === "PARTICIPANT_ADDED" &&
    req.body.participantType === "AGENT"
  ) {
    res.sendStatus(200);
    index.processAgentJoinEvent(req.body.engagementId);
  }

  // Listen for Agent Send Message
  else if (req.body.senderType === "AGENT") {
    res.sendStatus(200);

    // resolve promiseMap for agent send message and update receiveChat statistic
    index.processAgentSendMsgEvent(req.body.engagementId);
  }

  // Listen for Participant Disconnect
  else if (req.body.eventType === "PARTICIPANT_DISCONNECTED") {
    res.sendStatus(200);
    index.processAgentDisconnectEvent(req.body.engagementId);
  } else {
    res.sendStatus(200);
  }
});

// set Chat Parameters
app.post("/changeChatParameters", (req, res) => {
  res.sendStatus(200);
  logMessage(
    `received chatParameters, concurrentCallers: ${req.body.concurrentCallers}`
  );
  index.chatParameters.concurrentCallers = Number(req.body.concurrentCallers);
  index.chatParameters.chatSendMax = req.body.chatSendMax;
  index.chatParameters.firstMsgSendDelay = req.body.firstMsgSendDelay;
  index.chatParameters.respondMsgDelay = req.body.respondMsgDelay;
  //index.chatParameters.delayBetweenLoops = req.body.delayBetweenLoops;
  index.chatParameters.agentJoinTimeout = req.body.agentJoinTimeout;
});

// retrieve Chat Parameters
app.get("/getChatParameters", (req, res) => {
  res.send({
    framework: index.chatParameters.framework,
    concurrentCallers: index.chatParameters.concurrentCallers,
    chatSendMax: index.chatParameters.chatSendMax,
    firstMsgSendDelay: index.chatParameters.firstMsgSendDelay,
    respondMsgDelay: index.chatParameters.respondMsgDelay,
    //delayBetweenLoops: index.chatParameters.delayBetweenLoops,
    agentJoinTimeout: index.chatParameters.agentJoinTimeout,
  });
});

// GET to retrieve the chatStatsMap details
app.get("/getStats", (req, res) => {
  res.send(index.chatStatsMap);
});

// GET to reset the chatStatsMap details
app.get("/resetStats", (req, res) => {
  index.resetChatStats();
  logMessage(`---------- Stats Reset ----------`);
});

//GET to stop test gradually
app.get("/stopTest", (req, res) => {
  index.chatParameters.stopTest = true;
});

//GET to start test
app.get("/startTest", (req, res) => {
  //startLoop = true;
  index.startTest();
  logMessage(chalk.green("###### Chat Generator Started ######"));
  res.send(`******** Test Starting ********`);
});

//GET to start test
app.get("/demoTest", (req, res) => {
  logMessage(chalk.green("###### Demo of pipeline code added ######"));
  res.send(`******** Demo Complete 4 ********`);
});

//GET to demo test
// app.post("/demoTest2", (req, res) => {
//     res.sendStatus(200);
//     logMessage(chalk.green("###### Demo of pipeline code added ######"));
// });

module.exports.server = { server, framework, resetEventCounter };
