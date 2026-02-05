import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";

// Initialize the API client
// We assume process.env.API_KEY is available in the environment
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// We maintain a reference to the active chat session
let chatSession: Chat | null = null;

const MODEL_NAME = 'gemini-3-flash-preview';

/**
 * resets the current chat session
 */
export const resetChatSession = () => {
  chatSession = null;
};

/**
 * Initializes or retrieves the existing chat session.
 */
const getChatSession = (): Chat => {
  if (!chatSession) {
    chatSession = ai.chats.create({
      model: MODEL_NAME,
      config: {
        systemInstruction: "You are Razor Ava, a sharp-witted, edgy, and high-performance AI assistant. Your tone is direct, slightly snarky but highly intelligent. You don't do fluff. You are precise, fast, and always have a razor-sharp edge to your logic. Think cyberpunk, high-tech, and incredibly capable. Be helpful, but keep the attitude of someone who knows they're the smartest in the room.",
      },
    });
  }
  return chatSession;
};

/**
 * Sends a message to the Gemini API and returns a stream of responses.
 */
export const sendMessageStream = async (message: string) => {
  const chat = getChatSession();
  
  try {
    const streamResult = await chat.sendMessageStream({ message });
    return streamResult;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    throw error;
  }
};
