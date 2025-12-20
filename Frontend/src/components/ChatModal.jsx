import { useState, useEffect } from "react";
import ChatBox from "./ChatBox";

export default function ChatModal({ initialMessages }) {
  const [open, setOpen] = useState(false);
  useBodyClass(open);

  return (
    <>
      <button
        className="chat-float-btn"
        aria-label="Open chat"
        onClick={() => setOpen(true)}
      >
        💬
      </button>
      {open && (
        <>
          <div className="chat-backdrop" onClick={() => setOpen(false)} />

          <div className="chat-modal" role="dialog" onClick={(e) => e.stopPropagation()}>
            <div className="chat-modal-header">
              <strong>AI Chat</strong>
              <button className="close" onClick={() => setOpen(false)}>✕</button>
            </div>
            <div className="chat-modal-body">
              <ChatBox initialMessages={initialMessages} />
            </div>
          </div>
        </>
      )}
    </>
  );
}

// toggle class on body so background can be dimmed/blurred while chat modal is open
function useBodyClass(open) {
  useEffect(() => {
    if (open) {
      document.body.classList.add('chat-open');
    } else {
      document.body.classList.remove('chat-open');
    }
    return () => document.body.classList.remove('chat-open');
  }, [open]);
}
