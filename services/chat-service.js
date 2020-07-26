"use strict";
const axios = require("axios");
const cors = require("cors");
const express = require("express");
let app = express();
app.use(cors);

const port = 3000;

const baseURL = "http://10.134.47.235:31380";

// https://codingwithspike.wordpress.com/2018/03/10/making-settimeout-an-async-await-function/
// Making setTimeout an async/await function
async function wait(ms) {
  try {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  } catch (err) {
    console.log(`Error in function wait: ${err.message}`);
  }
}

const chatService = {
  async createSession() {
    const requestBody = {
      tenantId: "WQHIKJ",
      customerIdentifier: "custId",
      userId: "1234",
      displayName: "DermotNodeJS",
      firstName: "Dermot",
      lastName: "Sheerin",
      emailAddress: "japanese",
      contactNumber: "5555",
      sessionParameters: {
        language: "Japanese",
      },
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    try {
      const session = await axios.post(
        "http://10.134.47.235:31380/api/digital/v1/sessions",
        JSON.stringify(requestBody),
        config
      );

      console.log(session.data.sessionId);
      return (session.status = 201
        ? session.data.sessionId
        : console.log(session.status));
    } catch (err) {
      console.log(`Create SessionId Error: ${err.message}`);
    }
  },

  async createEngagement(sessionId) {
    await wait(2000);
    const requestBody = {
      sessionId: sessionId,
      tenantId: "WQHIKJ",
      customerIdentifier: "custId",
      channelProviderId: "SunShineConnector",
      conversation: "Well Savo here ....",
      mediaType: "CHAT",
      contextParameters: {
        language: "Japanese",
      },
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    try {
      const engagement = await axios.post(
        "http://10.134.47.235:31380/api/digital/v1/engagements",
        JSON.stringify(requestBody),
        config
      );

      console.log(engagement.data.engagementId);
      return (engagement.status = 200
        ? engagement.data.engagementId
        : console.log(engagement.status));
    } catch (err) {
      console.log(`Create Engagement Error: ${err.message}`);
    }
  },

  async createWebHook() {
    const requestBody = [
      {
        callbackUrl: "http://test912u343",
        eventTypes: ["ALL"],
      },
    ];

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    try {
      const webHookPost = await axios.post(
        "http://10.134.47.235/msg-webhook/v1/channel-providers/Reserved4Auto_sunshineProvider/webhooks",
        JSON.stringify(requestBody),
        config,
        function (req, res) {
          console.log("Got a GET request for the homepage");
          res.send("Hello GET");
        }
      );
      console.log(`Here in webHook ${webHookPost.data.webhookId}`);
    } catch (err) {
      console.log(`Create WebHook Error: ${err.message}`);
    }
  },
};

app.listen(port, () => console.log(`Server running on port ${port}`));

module.exports = chatService;
