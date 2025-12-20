import API from "../api/backend";
import { useState, useEffect } from "react";

export default function ChatBox({ initialMessages }) {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState(initialMessages || []);

  useEffect(() => {
    if (initialMessages) setMessages(initialMessages);
  }, [initialMessages]);

  const askQuestion = async () => {
    if (!question) return;
    const userMsg = { from: "user", text: question };
    setMessages((m) => [...m, userMsg]);

    try {
      const res = await API.post("/chat/ask", { question });
      const bot = { from: "bot", text: res.data.answer };
      setMessages((m) => [...m, bot]);
    } catch (e) {
      // server unavailable — inform the user without sample content
      const bot = { from: "bot", text: "Sorry, I couldn't reach the server. Please try again later." };
      setMessages((m) => [...m, bot]);
    }

    setQuestion("");
  };

  return (
    <div className="card chat-container">
      <h3>AI Chat</h3>
      <div className="chat-box" style={{ background: 'rgba(255,255,255,0.02)' }}>
        {messages && messages.length > 0 ? (
          messages.map((m, i) => (
            <div key={i} className={`chat-message ${m.from === 'user' ? 'user' : 'bot'}`}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
            </div>
          ))
        ) : (
          <div className="chat-message bot">Hi — ask a question about the video.</div>
        )}
      </div>

      <div className="chat-input">
        <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Ask from the video..." />
        <button onClick={askQuestion}>Give</button>
      </div>
    </div>
  );
}
