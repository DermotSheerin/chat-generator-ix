import cors from "cors";
import express from "express";
import axios from "axios";
import http from "http";
import random from "random";

import { isNull } from "util";

//const axios = require('axios')

// Parse URL-encoded bodies (as sent by HTML forms)

//var http = require('http');
//const random = require('random')

const app = express();
app.use(express.urlencoded());
app.use(express.json());

const port = 31380;

var webhookIdCounter = 100;

var webhookUrl = "";

app.use(cors());

app.get("/", (req, res) => {
  console.log("Got a request");
  res.send("Hello World!");
});

var sessionIdCounter = 100;
var engagementIdCounter = 1000;

app.post("/api/digital/v1/sessions", (req, res) => {
  console.log("Create session request");
  res.setHeader("Content-Type", "application/json");
  res.status(201);
  sessionIdCounter = sessionIdCounter + 1;
  var sessionIdStr = sessionIdCounter.toString();
  console.log(`Responding with sessionId ${sessionIdStr}`);
  res.end(JSON.stringify({ sessionId: sessionIdStr }));
});

app.post(
  "/api/digital/v1/channel-providers/:CHANNEL_PROVIDER_ID/webhooks",
  (req, res) => {
    console.log("Create session request");
    res.setHeader("Content-Type", "application/json");
    res.status(200);
    var webhookId = webhookIdCounter++;
    console.log(`Setting Callback url ${req.body[0].callbackUrl}`);
    webhookUrl = req.body[0].callbackUrl;
    console.log(`Setting Callback url ${webhookUrl}`);
    console.log(`Responding with webhookId ${webhookId}`);
    res.end(JSON.stringify({ webhookId: webhookId }));
  }
);

app.post("/api/digital/v1/sessions/:operation", (req, res) => {
  console.log(`Session operation request for session ${req}`);
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  res.end(JSON.stringify({ sessionId: 1 }));
});

app.post("/api/digital/v1/engagements", (req, res) => {
  console.log(`Create engagement request `);
  res.setHeader("Content-Type", "application/json");
  res.status(200);

  var sessionId = req.body.sessionId;
  engagementIdCounter = engagementIdCounter + 1;

  var engagementId = engagementIdCounter;
  console.log(
    `Responding with engagementId ${engagementId} : sessionId ${sessionId}`
  );

  setTimeout(
    webhook,
    20,
    sessionId,
    engagementId,
    "PARTICIPANT_ADDED_AGENT",
    "CUSTOMER"
  );

  setTimeout(webhook, 30, sessionId, engagementId, "ENGAGEMENT", "");

  setTimeout(
    webhook,
    8000,
    sessionId,
    engagementId,
    "PARTICIPANT_ADDED_AGENT",
    "AGENT"
  );

  res.end(JSON.stringify({ engagementId: engagementId.toString() }));
});

app.post("/api/digital/v1/engagements/:EngID", (req, res) => {
  var disconnected = req.params.EngID.includes("terminate");
  console.log(`Engagement request: Terminated: ${disconnected}`);
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  res.end(JSON.stringify({ engagementId: 1 }));
});

function webhook(sessionId, engagementId, eventType, participantType) {
  console.log(
    `Webhook:  sessionId : ${sessionId} engagementId => ${engagementId} eventType => ${eventType}`
  );

  if (webhookUrl.length == 0) {
    console.log(`Webhook:  error webhookUrl has not been set`);
    return;
  }

  var payload;
  if (eventType == "PARTICIPANT_ADDED_AGENT") {
    payload = genParticipantAddedPayload(
      sessionId,
      engagementId,
      participantType
    );
    /*
        {
          engagementId:  engagementId,
          eventType: "PARTICIPANT_ADDED",
          participantType: "AGENT"
        };
        */
  } else if (eventType == "MESSAGE") {
    payload = genMessagePayload(sessionId, engagementId, "Hello");
    /*
        {
            engagementId:  engagementId,
            eventType: "MESSAGES",
            senderType: "AGENT",
            body: { payload: "Hello" }
            };
            */
  } else if (eventType == "ENGAGEMENT") {
    payload = genEngagementCreatedPayload(
      sessionId,
      engagementId,
      participantType
    );
  } else {
    console.log("Error: unsupported eventType " + eventType);
    return;
  }

  axios({
    url: webhookUrl,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: JSON.stringify(payload),
  })
    .then(function (response) {
      console.log("posted");
      console.log(response.data);
    })
    .catch(function (error) {
      console.log(error);
    });
}

app.get("/api/digital/v1/engagements/:EngID", (req, res) => {
  var joined = req.params.EngID.includes("join");
  console.log(`ERROR Agent Join Request:  ${joined}`);
  res.setHeader("Content-Type", "application/json");
  res.status(200);

  //setTimeout(webhook, 100000, 'funky', "", "");

  var joined = random.int(0, 2) == 0;
  res.end(JSON.stringify({ agentJoined: joined }));
});

app.post(
  "/msg-agent-controller/agentcontroller/engagement/:engId/sendMessage",
  (req, res) => {
    var requestEngagementId = req.params.engId;
    var sessionId = req.body.sessionId;
    console.log(`Got a msg-agent-controller request ${requestEngagementId} `);
    res.setHeader("Content-Type", "application/json");
    res.status(200);
    setTimeout(webhook, 8000, sessionId, requestEngagementId, "MESSAGE", "");
    res.end(JSON.stringify({ engagementId: requestEngagementId }));
  }
);

app.post("/api/digital/v1/engagements/:EngID/messages", (req, res) => {
  var requestEngagementId = req.params.EngID;
  var sessionId = req.body.sessionId;
  console.log(`Request for engagement messages ${requestEngagementId}`);
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  setTimeout(webhook, 8000, sessionId, requestEngagementId, "MESSAGE", "");
  res.end(JSON.stringify({ engagementId: requestEngagementId }));
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}!`);
});

function genMessagePayload(sessionId, engagementId, messagePayload) {
  return {
    contextParameters: null,
    channelProviderId: "SunShineConnector",
    providerMessageId: null,
    attachments: null,
    recipientParticipants: [
      {
        participantId: "27a86d62-dea9-4a97-9aaf-c48c9579a936",
        participantAddress: "27a86d62-dea9-4a97-9aaf-c48c9579a936",
        displayName: "10010081",
        participantType: "AGENT",
        connectionId: "1c998035-fe8c-4a77-9d21-229a2367cc58",
      },
      {
        participantId: "eng",
        participantAddress: "eng",
        displayName: "Alex_2011874",
        participantType: "CUSTOMER",
        connectionId: "ae3258d9-3636-4fb0-8e39-172dcc23d3e9",
      },
    ],
    customData: null,
    dialogId: "941e1419-a810-443f-9722-aab23c498078",
    body: {
      elementText: { text: messagePayload, textFormat: "PLAINTEXT" },
      payload: null,
      elementType: "Text",
    },
    senderName: "Alex_2011874",
    parentMessageId: "string",
    correlationId: "COR6Qvy44kyys56",
    fallbackText: null,
    channelId: "CHAT",
    lastUpdatedTimestamp: 1597417427770,
    receivedTimestamp: 1597417427770,
    messageId: "356a4c60-4ab4-413a-b7cf-6f0eaefbb167",
    eventType: "MESSAGES",
    sessionId: sessionId,
    providerDialogId: "",
    providerParentMessageId: null,
    tenantId: "LMZTIB",
    businessAccountName: null,
    providerSenderId: null,
    header: null,
    senderType: "AGENT",
    engagementId: engagementId,
    status: "DELIVERED",
  };
}

function genParticipantAddedPayload(sessionId, engagementId, participantType) {
  console.log(`Getting payload: '${participantType}' ${engagementId} `);

  return {
    channelProviderId: "SunShineConnector",
    displayName: "10010085",
    createdTimestamp: 1597418360391,
    participantType: participantType,
    providerParticipantId: "",
    eventType: "PARTICIPANT_ADDED",
    sessionId: sessionId,
    dialogId: "f4f44887-535d-44c0-b108-7e451102842d",
    participantId: "62e3041e-baa4-4c9c-ad51-b37e014049d8",
    providerDialogId: "",
    tenantId: "LMZTIB",
    connectionId: "22fd3353-f067-4c1c-85b8-fcf7f16d8c5c",
    engagementId: engagementId,
  };
}

function genEngagementCreatedPayload(sessionId, engagementId) {
  return {
    customerIdentifiers: null,
    createdTimestamp: 1597418351618,
    tenantId: "LMZTIB",
    correlationId: "Well Savo here ....",
    eventType: "ENGAGEMENT_CREATED",
    sessionId: sessionId,
    dialogId: "f4f44887-535d-44c0-b108-7e451102842d",
    engagementId: engagementId,
    conversation: "Well Savo here ....",
    channelId: "CHAT",
  };
}
