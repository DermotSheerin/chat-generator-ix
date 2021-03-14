const index = require("../index.js");
const { logMessage } = require("../logger/logger");
const express = require("express");
const chalk = require("chalk");
const moment = require("moment");
const http = require("http");
const socketIo = require('socket.io');
const bodyParser = require("body-parser");
const app = express();
const cors = require("cors");
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json(), cors());
let interval;


// reuse the HTTP server to run socket.io within the same HTTP server instance
const server = http.createServer(app);

//  call to socketIo() to initialize a new instance by passing in the server object and set origins
//  option on the server side to allow cross-origin requests
const io = socketIo(server, {
    cors: {
        origin: '*',
    }});

// using setInterval to emit the chatStats object every second
// Socket.IO on() takes two arguments: the name of the event, in this case "connection",
// and a callback which will be executed after every connection event. The connection event returns a socket object which will
// be passed to the callback function. By using said socket you will be able to send data back to a client in real time.
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

const getChatStats = socket => {
    // const response = new Date();
    // Emitting a new message. Will be consumed by the client
    socket.emit("FromAPI", index.chatStatsMap);
};


app.post("/allEvents", (req, res) => {
    // Listen for Agent Join
    if (req.body.eventType === "PARTICIPANT_ADDED" && req.body.participantType === "AGENT") {
        res.sendStatus(200);
        index.processAgentJoinEvent(req.body.engagementId);
    }

    // Listen for Agent Send Message
    else if (req.body.senderType === "AGENT") {
        res.sendStatus(200);

        // after predefined delay respond to Agent message
        setTimeout(() => {
            index.processAgentSendMsgEvent(req.body.engagementId);
        }, index.chatParameters.respondMsgDelay);
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
    logMessage(`received chatParameters, concurrentCallers: ${req.body.concurrentCallers}`)
    index.chatParameters.concurrentCallers = Number(req.body.concurrentCallers);
    logMessage(`concurrentCallers post, concurrentCallers: ${req.body.concurrentCallers} and in index: ${index.chatParameters.concurrentCallers}`)
    index.chatParameters.chatSendMax = req.body.chatSendMax;
    index.chatParameters.firstMsgSendDelay = req.body.firstMsgSendDelay;
    index.chatParameters.respondMsgDelay = req.body.respondMsgDelay;
    index.chatParameters.delayBetweenLoops = req.body.delayBetweenLoops;
    index.chatParameters.agentJoinTimeout = req.body.agentJoinTimeout;
});

// retrieve Chat Parameters
app.get("/getChatParameters", (req, res) => {
    res.send({
        concurrentCallers: index.chatParameters.concurrentCallers,
        chatSendMax: index.chatParameters.chatSendMax,
        firstMsgSendDelay: index.chatParameters.firstMsgSendDelay,
        respondMsgDelay: index.chatParameters.respondMsgDelay,
        delayBetweenLoops: index.chatParameters.delayBetweenLoops,
        agentJoinTimeout: index.chatParameters.agentJoinTimeout,
    });
});

// GET to retrieve the chatStatsMap details
app.get("/getStats", (req, res) => {
    res.send(index.chatParameters.chatStatsMap);
});

//GET to stop test gradually
app.get("/stopTest", (req, res) => {
    index.chatParameters.startLoop = false;
    res.send(`******** Test will terminate gracefully ********`);
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
    logMessage(`Here is agentJoinTimeout ${index.chatParameters.agentJoinTimeout}`)
    res.send(`******** Demo Complete 4 ********`);
});

module.exports.server = server;


