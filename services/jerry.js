import "dotenv/config";
import cors from "cors";
import express from "express";

const axios = require("axios");

var http = require("http");
const random = require("random");

const app = express();

const port = 31380;

var sessionId = 100;

var engagementId = 100;

app.use(cors());

app.get("/", (req, res) => {
  console.log("Got a request");
  res.send("Hello World!");
});

app.post("/api/digital/v1/sessions", (req, res) => {
  console.log("Create session request");
  res.setHeader("Content-Type", "application/json");
  res.status(201);
  sessionId = sessionId + 1;
  console.log("Responding with sessionId ${sessionId}");
  res.end(JSON.stringify({ SessionID: sessionId }));
});

app.post("/api/digital/v1/sessions/:terminate", (req, res) => {
  console.log(`Session terminate request for session ${req}`);
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  res.end(JSON.stringify({ SessionID: 1 }));
});

app.post("/api/digital/v1/engagements", (req, res) => {
  console.log(`Create engagement request `);
  res.setHeader("Content-Type", "application/json");
  res.status(200);

  engagementId = engagementId + 1;
  console.log(`Responding with engagementId ${engagementId}`);
  res.end(JSON.stringify({ engagementId: engagementId }));
});

app.post("/api/digital/v1/engagements/:EngID/messages", (req, res) => {
  var requestEngagementId = req.param("EngID");
  console.log(`Request for engagement messages ${requestEngagementId}`);
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  res.end(JSON.stringify({ engagementId: requestEngagementId }));
});

app.post("/api/digital/v1/engagements/:EngID", (req, res) => {
  var disconnected = req.param("EngID").includes("terminate");
  console.log(`Engagement request: Terminated: ${disconnected}`);
  res.setHeader("Content-Type", "application/json");
  res.status(200);
  res.end(JSON.stringify({ engagementId: 1 }));
});

function webhook(arg) {
  console.log(`arg was => ${arg}`);

  axios({
    url: "http://localhost:9091",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    data: JSON.stringify({ k1: "1111" }),
  })
    .then(function (response) {
      console.log(response.data);
    })
    .catch(function (error) {
      console.log(error);
    });
}

app.get("/api/digital/v1/engagements/:EngID", (req, res) => {
  var joined = req.param("EngID").includes("join");
  console.log(`Agent Join Request:  ${joined}`);
  res.setHeader("Content-Type", "application/json");
  res.status(200);

  setTimeout(webhook, 5000, "funky");

  var joined = random.int(0, 2) == 0;
  res.end(JSON.stringify({ agentJoined: joined }));
});

app.post(
  "/msg-agent-controller/agentcontroller/engagement/:engId/sendMessage",
  (req, res) => {
    var requestEngagementId = req.param("engId").includes("join");
    console.log(`Got a msg-agent-controller request ${requestEngagementId} `);
    res.setHeader("Content-Type", "application/json");
    res.status(200);
    res.end(JSON.stringify({ engagementId: 1 }));
  }
);

app.listen(port, () => console.log(`Example app listening on port ${port}!`)); // list on thos port
