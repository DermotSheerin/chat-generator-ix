const index = require("../index.js");
const { logMessage } = require("../logger/logger");
const chalk = require("chalk");
const utils = require("../utilities/os-utils.js");
let interval;
let maxValues;
let eventCounter = 0;

const server = require('fastify')();
// fastify-cors enables the use of CORS in a Fastify application.
server.register(require('fastify-cors'), {
    origin: '*',
    methods: ["GET", "POST"]
});

// Since Socket.IO v3, you need to explicitly enable Cross-Origin Resource Sharing (CORS). server.server is same as httpServer
const socketIo = require('socket.io')(server.server,
    {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

socketIo.on('connection', (socket) => {
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
})

const getChatStats = socket => {
    // Emitting a new message. Will be consumed by the client
    const usedMem = utils.usedMem();
    const cpuTime = utils.cpuTime();

    maxValues = utils.getMaxValues(usedMem, cpuTime.userTime, cpuTime.systemTime);

    socket.emit("FromAPI",
        {
            chatStatsMap: index.chatStatsMap,
            eventCounter: eventCounter,
            testTime: { startTime: index.chatParameters.startTime, stopTime: index.chatParameters.stopTime },
            usedMemGraph: {name: utils.currentTime(), value: usedMem},
            resourceStats: {
                usedMem: [`${usedMem} MB`, maxValues.maxMem],
                userTime: [`${cpuTime.userTime} secs`, maxValues.maxUserTime],
                systemTime: [`${cpuTime.systemTime} secs`, maxValues.maxSystemTime ]
            },
        });
};


server.post("/allEvents", (request, reply) => {
    // Listen for Agent Join
    if (request.body.eventType === "PARTICIPANT_ADDED" && request.body.participantType === "AGENT") {
        reply.code(200);
        index.processAgentJoinEvent(request.body.engagementId);
    }

    // Listen for Agent Send Message
    else if (request.body.senderType === "AGENT") {
        reply.code(200);

        // after predefined delay respond to Agent message
        setTimeout(() => {
            index.processAgentSendMsgEvent(request.body.engagementId);
        }, index.respondMsgDelay);
    }

    // Listen for Participant Disconnect
    else if (request.body.eventType === "PARTICIPANT_DISCONNECTED") {
        reply.code(200);
        index.processAgentDisconnectEvent(request.body.engagementId);
    } else {
        reply.code(200);
    }
});


// set Chat Parameters
server.post("/changeChatParameters", (request, reply) => {
    reply.code(200);
    logMessage(`received chatParameters, concurrentCallers: ${request.body.concurrentCallers}`)
    index.chatParameters.concurrentCallers = request.body.concurrentCallers;
    index.chatParameters.chatSendMax = request.body.chatSendMax;
    index.chatParameters.firstMsgSendDelay = request.body.firstMsgSendDelay;
    index.chatParameters.respondMsgDelay = request.body.respondMsgDelay;
    index.chatParameters.delayBetweenLoops = request.body.delayBetweenLoops;
    index.chatParameters.agentJoinTimeout = request.body.agentJoinTimeout;
});

// retrieve Chat Parameters
server.get("/getChatParameters", (request, reply) => {
    reply.send({
        concurrentCallers: index.chatParameters.concurrentCallers,
        chatSendMax: index.chatParameters.chatSendMax,
        firstMsgSendDelay: index.chatParameters.firstMsgSendDelay,
        respondMsgDelay: index.chatParameters.respondMsgDelay,
        delayBetweenLoops: index.chatParameters.delayBetweenLoops,
        agentJoinTimeout: index.chatParameters.agentJoinTimeout,
    });
});

// GET to retrieve the chatStatsMap details
server.get("/getStats", (request, reply) => {
    reply.send(index.chatStatsMap);
});

//GET to stop test gradually
server.get("/stopTest", (request, reply) => {
    index.chatParameters.startLoop = false;
    reply.send(`******** Test will terminate gracefully ********`);
});

//GET to start test
server.get("/startTest", (request, reply) => {
    //startLoop = true;
    index.startTest();
    logMessage(chalk.green("###### Chat Generator Started ######"));
    reply.send(`******** Test Starting ********`);
});

//GET to start test
server.get("/demoTest", (request, reply) => {
    logMessage(chalk.green("###### Demo of pipeline code added ######"));
    logMessage(`Here is agentJoinTimeout ${index.chatParameters.gentJoinTimeout}`)
    reply.send(`******** Demo Complete 4 ********`);
});

module.exports.server = server;


