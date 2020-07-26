const chatService = require("./services/chat-service");

//const chatService = new ChatService("http://10.134.47.235:31380");

async function createChat() {
  const sessionId = await chatService.createSession();
  const engagementId = await chatService.createEngagement(sessionId);
  console.log(
    `Done: SessionID: ${sessionId} and engagementID: ${engagementId}`
  );
}

createChat();
