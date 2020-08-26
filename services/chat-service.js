"use strict";
const axios = require("axios");


const port = 3000;
const channelProviderId = "SunShineConnector";
const callBackURL = "http://135.123.64.15:" + port + "/messages";
const tenantId = "WKABCK";

// https://codingwithspike.wordpress.com/2018/03/10/making-settimeout-an-async-await-function/
// Making setTimeout an async/await function

const chatService = {
  async createWebHook() {
    const requestBody = [
      {
        callbackUrl: callBackURL,
        eventTypes: ["MESSAGES"],
      },
    ];

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    try {
      const webHookPost = await axios.post(
        "http://10.134.47.235/api/digital/v1/channel-providers/" +
          channelProviderId +
          "/webhooks",
        JSON.stringify(requestBody),
        config
      );
      console.log(`Here in webHook, webhookId: ${webHookPost.data.webhookId}`);
    } catch (err) {
      console.log(`Create WebHook Error: ${err.message}`);
    }
  },

  async createSession(displayName) {
    const requestBody = {
      tenantId: tenantId,
      customerIdentifier: "custId",
      channelProviderId: channelProviderId,
      userId: "1234",
      displayName: displayName,
      firstName: "Dermot",
      lastName: "Sheerin",
      emailAddress: "english@fs2.lab",
      contactNumber: "5555",
      sessionParameters: {
        language:"English",
      },
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    try {
      const session = await axios.post(
        "http://10.134.47.235/api/digital/v1/sessions",
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
    const requestBody = {
      sessionId: sessionId,
      tenantId: tenantId,
      customerIdentifier: "custId",
      channelProviderId: channelProviderId,
      conversation: "Well Savo here ....",
      mediaType: "CHAT",
      contextParameters: {
        language:"English",
      },
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    try {
      const engagement = await axios.post(
        "http://10.134.47.235/api/digital/v1/engagements",
        JSON.stringify(requestBody),
        config
      );

      console.log(engagement.data.engagementId);
      return await (engagement.status = 200
        ?  {
            engagementId: engagement.data.engagementId,
            correlationId: engagement.data.correlationId,
            dialogId: engagement.data.dialogId,
          }
        : console.log(engagement.status));
      // throw an exception here if 200ok does not come back
      // have a counter for num of successful and failed chats (global variable, increment as i go)
    } catch (err) {
      console.log(`Create Engagement Error: ${err.message}`);
    }
  },

  async sendChat(
    sessionId,
    engagementId,
    correlationId,
    dialogId,
    chatMessage
  ) {
    const requestBody = {
      correlationId: correlationId,
      parentMessageId: "parentMessageId",
      sessionId: sessionId,
      dialogId: dialogId,
      senderType: "CUSTOMER",
      senderName: "Test Name",
      body: {
        elementType: "Text",
        elementText: {
          text: chatMessage,
          textFormat: "PLAINTEXT",
        },
      },
    };

    const config = {
      headers: {
        "Content-Type": "application/json",
      },
    };

    const url =
      "http://10.134.47.235/api/digital/v1/engagements/" +
      engagementId +
      "/messages";

    try {
      const response = await axios.post(
        url,
        JSON.stringify(requestBody),
        config
      );
      return response;
    } catch (err) {
      console.log(`SendChat Error: ${err.message}`);
    }
  },
};

module.exports = chatService;

