import OpenAI from "openai";
import axios from "axios";

let openaiClient = null;

function getOpenAI() {
  if (openaiClient) return openaiClient;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  openaiClient = new OpenAI({ apiKey });
  return openaiClient;
}

export const askRagQuestion = async (sessionId, question, videoId = null) => {
  try {
    // Call the AI services RAG chat endpoint
    const AI_SERVICES_URL = process.env.AI_SERVICES_URL || 'https://successful-youthfulness-production-692c.up.railway.app';
    const response = await axios.post(`${AI_SERVICES_URL}/chat`, {
      video_id: videoId,
      question: question,
      language: 'en'
    });

    return { answer: response.data.answer };
  } catch (error) {
    console.error('RAG chat error:', error.message);

    // Fallback to OpenAI if RAG fails
    const openai = getOpenAI();
    if (!openai) {
      throw new Error('Both RAG service and OpenAI are unavailable. Check AI services and OPENAI_API_KEY.');
    }

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Answer only from video content." },
        { role: "user", content: question }
      ]
    });

    return { answer: response.choices[0].message.content };
  }
};
