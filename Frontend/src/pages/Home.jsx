import VideoForm from "../components/VideoInput";
import Quiz from "../components/Quiz";
import ChatModal from "../components/ChatModal";
import API from "../api/backend";
import { useState } from "react";

export default function Home() {
  const [url, setUrl] = useState("");
  const [transcript, setTranscript] = useState([]);
  const [summary, setSummary] = useState("");
  const [questions, setQuestions] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState("transcript"); // 'transcript' | 'summary'
  const [selectedTranscriptIndex, setSelectedTranscriptIndex] = useState(null);

  const fetchTranscript = async () => {
    try {
      const res = await API.get("/session/transcript");
      return res.data.transcript || [];
    } catch (err) {
      return [];
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await API.get("/session/summary");
      return res.data.summary || "";
    } catch (err) {
      return "";
    }
  };

  const handleSummarize = async () => {
    if (!url) return alert("Please paste a YouTube URL first.");
    setLoading(true);
    // start processing
    try {
      await API.post("/session/start", { youtubeUrl: url });
    } catch (err) {
      console.error(err);
    }

    // poll for transcript/summary
    const start = Date.now();
    const timeout = 30_000; // 30s

    const poll = async () => {
      const t = await fetchTranscript();
      const s = await fetchSummary();

      if ((t && t.length > 0) || Date.now() - start > timeout) {
        setTranscript(t);
        setSummary(s);
        // generate quiz once transcript/summary available
        generateQuiz(t, s);
        setLoading(false);
        return;
      }

      setTimeout(poll, 2000);
    };

    poll();
  };

  const handleGetTranscript = async () => {
    if (!url) return alert("Please paste a YouTube URL first.");
    setLoading(true);
    try {
      // assume session already started; call endpoint to fetch transcript
      const t = await fetchTranscript();
      if (t && t.length) {
        setTranscript(t);
        // generate quiz from fetched transcript
        await generateQuiz(t, summary);
      } else {
        // backend returned empty — clear transcript
        setTranscript([]);
        await generateQuiz([], summary);
      }
    } catch (e) {
      console.error(e);
      console.error(e);
      // network or server error — clear transcript
      setTranscript([]);
      await generateQuiz([], summary);
    }
    setLoading(false);
  };

  const handleGenerateSummary = async () => {
    if (!url) return alert("Please paste a YouTube URL first.");
    setLoading(true);
    try {
      await API.post("/session/start", { youtubeUrl: url });
      const s = await fetchSummary();
      if (s && s.length) {
        setSummary(s);
        await generateQuiz(transcript, s);
      } else {
        // no summary available
        setSummary("");
        await generateQuiz(transcript, "");
      }
    } catch (e) {
      console.error(e);
      // network error — clear summary
      setSummary("");
      await generateQuiz(transcript, "");
    }
    setLoading(false);
  };

  const generateQuiz = async (t = transcript, s = summary) => {

    try {
      const payload = { youtubeUrl: url };
      if (t && t.length) payload.transcript = t;
      if (s) payload.summary = s;
      try {
        const res = await API.post("/quiz/generate", payload);
        const q = res.data.quiz || res.data.questions || [];
        if (q && q.length) {
          setQuestions(q);
          return;
        }
      } catch (e) {
        // swallow and fallback to local generation below
        console.warn("quiz endpoint failed, falling back to local generation", e);
      }

      // local fallback quiz generator (keyword-based); do not inject sample questions
      const local = [];
      if (s && s.toLowerCase().includes("sql as")) {
        local.push({ question: "What is the purpose of SQL AS?", options: ["Rename columns", "Delete rows", "Create triggers", "Optimize queries"] });
      }
      if ((s && s.toLowerCase().includes("concat")) || (t && JSON.stringify(t).toLowerCase().includes("concat"))) {
        local.push({ question: "Which function combines strings in SQL?", options: ["CONCAT", "SUM", "ROUND", "MIN"] });
      }
      // if no quiz items could be generated, leave questions empty
      setQuestions(local);
    } catch (e) {
      console.error("generateQuiz error", e);
      // on error, clear questions
      setQuestions([]);
    }
  };

  return (
    <>
    <div className="app-container">
      <header className="header">
          <h1 className="brand">YouTube Video Summarizer</h1>
      </header>

      

      <main className="layout">
        <section className="left">
          <div className="player card">
            {/* embedded video player */}
            {url ? (
              <div className="player-wrap">
                <iframe
                  title="youtube-player"
                  src={`https://www.youtube.com/embed/${(function(){ try{ const u = new URL(url); const p = u.searchParams.get('v'); if(p) return p; const path = u.pathname.split('/'); return path[path.length-1]; }catch(e){ return '' }} )()}`}
                  frameBorder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="player-placeholder">Paste a YouTube link to load the player</div>
            )}
          </div>

          <div className="controls card">
            <VideoForm url={url} setUrl={setUrl} onProcess={handleSummarize} />

            <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button type="button" className="primary-btn" onClick={handleGetTranscript}>
                {loading ? 'Working...' : 'Get Transcript'}
              </button>
              <button type="button" className="primary-btn" onClick={handleGenerateSummary}>
                {loading ? 'Working...' : 'Generate Summary'}
              </button>
            </div>
          </div>

          <div className="transcript card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h4 style={{ margin: 0 }}>About video</h4>
              <div className="view-toggle">
                <button type="button"
                  className={viewMode === 'transcript' ? 'toggle active' : 'toggle'}
                  onClick={(e) => { e.preventDefault(); setViewMode('transcript'); setSelectedTranscriptIndex(null); }}
                >
                  Transcript
                </button>
                <button type="button"
                  className={viewMode === 'summary' ? 'toggle active' : 'toggle'}
                  onClick={(e) => { e.preventDefault(); setViewMode('summary'); }}
                >
                  Summary
                </button>
              </div>
            </div>

            <div className="transcript-body">
              {viewMode === 'transcript' ? (
                transcript && transcript.length > 0 ? (
                  <>
                    {selectedTranscriptIndex !== null && transcript[selectedTranscriptIndex] && (
                      <div className="transcript-preview" style={{ padding: 10, marginBottom: 10, background: 'rgba(255,255,255,0.01)', borderRadius: 8 }}>
                        <strong>{transcript[selectedTranscriptIndex].time || transcript[selectedTranscriptIndex].start || '00:00'}</strong>
                        <div style={{ marginTop: 6 }}>{transcript[selectedTranscriptIndex].text || transcript[selectedTranscriptIndex]}</div>
                      </div>
                    )}

                    {transcript.map((t, idx) => (
                      <div className={`transcript-block clickable ${selectedTranscriptIndex === idx ? 'selected' : ''}`} key={idx} onClick={() => setSelectedTranscriptIndex(idx)}>
                        <strong>{t.time || t.start || "00:00"}</strong>
                        <p>{t.text || t}</p>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="muted">Transcript will appear here after summarization.</div>
                )
              ) : (
                summary ? (
                  <div className="summary-text">{summary}</div>
                ) : (
                  <div className="muted">Summary will appear here after generation.</div>
                )
              )}
            </div>
          </div>
        </section>

        <aside className="right">
          <div className="quiz-panel card">
            <Quiz questions={questions} onGenerate={() => generateQuiz()} />
          </div>
        </aside>
      </main>

      

    </div>
    <ChatModal initialMessages={chatMessages} />
    </>
  );
}
