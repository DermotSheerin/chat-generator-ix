"use strict";
const axios = require("axios");
const chalk = require("chalk");
const port = 3000;
const channelProviderId = "SunShineConnector";
const callBackURL = "http://135.123.64.15:" + port + "/messages";
const tenantId = "WKABCK";

// https://codingwithspike.wordpress.com/2018/03/10/making-settimeout-an-async-await-function/
// Making setTimeout an async/await function

const config = {
  headers: {
    "Content-Type": "application/json",
  },
};

const chatService = {
  async createWebHook() {
    const requestBody = [
      {
        callbackUrl: callBackURL,
        eventTypes: ["MESSAGES"],
      },
    ];

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
        language: "English",
      },
    };

    try {
      const session = await axios.post(
        "http://10.134.47.235/api/digital/v1/sessions",
        JSON.stringify(requestBody),
        config
      );

      // return (session.status = 201
      //   ? session.data.sessionId
      //   : console.log(chalk.red(`Create Session Error: ${session.status}`)));

      if (session.status === 201) {
        return { sessionId: session.data.sessionId, success: true };
      } else {
        console.log(chalk.red(`Create Session Error, Session Status code: ${session.status}`));
        return { success: false };
      }
    } catch (err) {
      console.log(chalk.red(`Create Session Error: ${err.message}`));
      return { success: false };
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
        language: "English",
      },
    };

    try {
      const engagement = await axios.post(
        "http://10.134.47.235/api/digital/v1/engagements",
        JSON.stringify(requestBody),
        config
      );

      if (engagement.status === 200) {
        return {
          engagementId: engagement.data.engagementId,
          correlationId: engagement.data.correlationId,
          dialogId: engagement.data.dialogId,
          success: true,
        };
      } else {
        console.log(chalk.red(`Create Engagement Error, Engagement Status code: ${engagement.status}, sessionId: ${sessionId}`));
        return { success: false };
      }
    } catch (err) {
      console.log(chalk.red(`Create Engagement Error: ${err.message}, sessionId: ${sessionId}`));
      return { success: false };
    }

    // return await (engagement.status = 200
    //   ? {
    //       engagementId: engagement.data.engagementId,
    //       correlationId: engagement.data.correlationId,
    //       dialogId: engagement.data.dialogId,
    //     }
    //   : console.log(
    //       chalk.red(`Create Engagement Error: ${engagement.status}`)
    //     ));

    // throw an exception here if 200ok does not come back
    // have a counter for num of successful and failed chats (global variable, increment as i go)
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

      if (response.status === 200) {
        return { success: true };
      } else {
        console.log(chalk.red(`Send Chat Error, Chat Status code: ${response.status}, engId: ${engagementId}`));
        return { success: false };
      }
    } catch (err) {
      console.log(chalk.red(`Send Chat Error: ${err.message}, engId: ${engagementId}`));
      return { success: false };
    }
  },
};

module.exports = chatService;
