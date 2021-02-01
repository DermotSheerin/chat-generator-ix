"use strict";
const axios = require("axios");
const chalk = require("chalk");
const port = 8000;
const channelProviderId = "SunShineConnector";

// const callBackURL = "http://135.123.65.38:" + port + "/allEvents";
// const tenantId = "WKABCK";
// const IX_CLUSTER_IP = "10.134.47.235";

const callBackURL = "http://135.123.64.157:" + port + "/allEvents";
const tenantId = "WKABCK";
const IX_CLUSTER_IP = "10.134.45.26:3000";

// https://codingwithspike.wordpress.com/2018/03/10/making-settimeout-an-async-await-function/
// Making setTimeout an async/await function

const config = {
    headers: {
        "Content-Type": "application/json",
        "Accept": "application/json" // added Sept 9th
    },
};

const chatService = {
    async createWebHook() {
        const requestBody = [
            {
                callbackUrl: callBackURL,
                eventTypes: ["ALL"],
            },
        ];

        try {
            const webHookPost = await axios.post(
                "http://" +
                IX_CLUSTER_IP +
                "/api/digital/v1/channel-providers/" +
                channelProviderId +
                "/webhooks",
                JSON.stringify(requestBody),
                config
            );

            if (webHookPost.status === 201) {
                return {webhookId: webHookPost.data.webhookId, success: true};
            } else {
                console.log(
                    chalk.red(
                        `Create Webhook Error, Webhook Status code: ${webHookPost.status}`
                    )
                );
                return {success: false};
            }
        } catch (err) {
            console.log(chalk.red(`Create Webhook Error: ${err.message}`));
            return {success: false};
        }
    },

    async deleteWebHook(webhookId) {
        try {
            const webHookPost = await axios.delete(
                "http://" +
                IX_CLUSTER_IP +
                "/api/digital/v1/channel-providers/" +
                channelProviderId +
                "/webhooks/" +
                webhookId,
                config
            );

            if (webHookPost.status === 200) {
                console.log(
                    chalk.green(
                        `Webhook Deleted Successfully, Status code: ${webHookPost.status}`
                    )
                );
                return {success: true};
            } else {
                console.log(
                    chalk.red(
                        `Delete Webhook Error, Webhook Status code: ${webHookPost.status}`
                    )
                );
                return {success: false};
            }
        } catch (err) {
            console.log(chalk.red(`Delete Webhook Error: ${err.message}`));
            return {success: false};
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
                "http://" + IX_CLUSTER_IP + "/api/digital/v1/sessions",
                JSON.stringify(requestBody),
                config
            );

            // return (session.status = 201
            //   ? session.data.sessionId
            //   : console.log(chalk.red(`Create Session Error: ${session.status}`)));

            if (session.status === 201) {
                return {sessionId: session.data.sessionId, success: true};
            } else {
                console.log(
                    chalk.red(
                        `Create Session Error, Session Status code: ${session.status}`
                    )
                );
                return {success: false};
            }
        } catch (err) {
            console.log(chalk.red(`Create Session Error: ${err.message}`));
            return {success: false};
        }
    },

    async terminateSession(sessionId) {
        const data = {"channelProviderId": channelProviderId, "reason": "USER_CLOSED"}

        try {
            const terminateSession = await axios.post(
                "http://" + IX_CLUSTER_IP + "/api/digital/v1/sessions/" + sessionId + ":terminate",
                data,
                config
            );

            if (terminateSession.status === 200) {
                return {success: true};
            } else {
                console.log(
                    chalk.red(
                        `Terminate Session Error, Session Status code: ${terminateSession.status}`
                    )
                );
                return {success: false};
            }
        } catch (err) {
            console.log(chalk.red(`Terminate Session Error: ${err.message}`));
            return {success: false};
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
                "http://" + IX_CLUSTER_IP + "/api/digital/v1/engagements",
                JSON.stringify(requestBody),
                config
            );

            if (engagement.status === 200) {
                return {
                    engagementId: engagement.data.engagementId,
                    correlationId: engagement.data.correlationId,
                    dialogId: engagement.data.dialogId,
                    sessionId: engagement.data.sessionId,
                    success: true,
                };
            } else {
                console.log(
                    chalk.red(
                        `Create Engagement Error, Engagement Status code: ${engagement.status}, sessionId: ${sessionId}`
                    )
                );
                return {success: false};
            }
        } catch (err) {
            console.log(
                chalk.red(
                    `Create Engagement Error: ${err.message}, sessionId: ${sessionId}`
                )
            );
            return {success: false};
        }
    },

    async getParticipantId(engagementId) {
        try {
            const engagement = await axios.get(
                "http://" + IX_CLUSTER_IP + "/api/digital/v1/engagements/" + engagementId,
                config
            );

            if (engagement.status === 200) {
                return {participantId: engagement.data.dialogs[0].sourceParticipantId, success: true};
            } else {
                console.log(
                    chalk.red(
                        `Retrieve Engagement Error, Engagement Status code: ${engagement.status}`
                    )
                );
                return {success: false};
            }
        } catch (err) {
            console.log(chalk.red(`Retrieve Engagement Error: ${err.message}`));
            return {success: false};
        }
    },

    async disconnectEngagement(engagementId, sessionId, dialogId, participantId) {
        const data = {
            sessionId: sessionId,
            dialogId: dialogId,
            participantId: participantId,
            reason: "USER_DISCONNECTED"
        }

        try {
            const disconnectEngagement = await axios.post(
                "http://" + IX_CLUSTER_IP + "/api/digital/v1/engagements/" + engagementId + ":disconnect",
                data,
                config
            );

            if (disconnectEngagement.status === 200) {
                return {success: true};
            } else {
                console.log(
                    chalk.red(
                        `Disconnect Engagement Error, Engagement Status code: ${disconnectEngagement.status}`
                    )
                );
                return {success: false};
            }
        } catch (err) {
            console.log(chalk.red(`Disconnect Engagement Error: ${err.message}`));
            return {success: false};
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

        const url =
            "http://" +
            IX_CLUSTER_IP +
            "/api/digital/v1/engagements/" +
            engagementId +
            "/messages";

        try {
            const response = await axios.post(
                url,
                JSON.stringify(requestBody),
                config
            );

            if (response.status === 200) {
                return {success: true};
            } else {
                console.log(
                    chalk.red(
                        `Send Chat Error, Chat Status code: ${response.status}, engId: ${engagementId}`
                    )
                );
                return {success: false};
            }
        } catch (err) {
            console.log(
                chalk.red(`Send Chat Error: ${err.message}, engId: ${engagementId}`)
            );
            return {success: false};
        }
    },
};

module.exports = chatService;
