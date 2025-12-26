import VideoInput from "../components/VideoInput";
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

  // Parse quiz string format into array of objects
  const parseQuizString = (quizString) => {
    console.log('Starting to parse quiz string...');
    const questions = [];

    // Split by numbered question patterns (1., 2., etc.)
    const questionBlocks = quizString.split(/\d+\.\s+/).filter(block => block.trim());
    console.log('Question blocks found:', questionBlocks.length);

    questionBlocks.forEach((block, index) => {
      console.log(`Processing block ${index + 1}:`, block.substring(0, 100) + '...');
      const lines = block.split('\n').filter(line => line.trim());
      console.log(`Block ${index + 1} has ${lines.length} lines`);
      if (lines.length === 0) return;

      // Find the question text (first non-option line)
      let questionText = '';
      const options = [];
      let correctAnswer = 0;

      lines.forEach((line, lineIndex) => {
        console.log(`Line ${lineIndex}: "${line}"`);

        // Extract question text (lines that don't start with A), B), C), D) or "Correct Answer:")
        if (!line.match(/^\s*[A-D]\)\s*/) && !line.match(/Correct Answer:/) && questionText === '') {
          questionText = line.trim();
          console.log('Found question text:', questionText);
        }

        // Extract options (A, B, C, D) - handle leading spaces
        const optionMatch = line.match(/^\s*[A-D]\)\s*(.+)$/);
        if (optionMatch) {
          options.push(optionMatch[1].trim());
          console.log('Found option:', optionMatch[1].trim());
        }

        // Extract correct answer
        const correctMatch = line.match(/Correct Answer:\s*([A-D])/);
        if (correctMatch) {
          correctAnswer = correctMatch[1].charCodeAt(0) - 65; // A=0, B=1, C=2, D=3
          console.log('Found correct answer:', correctMatch[1], '-> index:', correctAnswer);
        }
      });

      console.log(`Block ${index + 1} summary: question="${questionText}", options=${options.length}, correct=${correctAnswer}`);

      if (options.length > 0 && questionText) {
        questions.push({
          question: `${index + 1}. ${questionText}`,
          options,
          correct: correctAnswer
        });
        console.log(`Added question ${index + 1} to array`);
      } else {
        console.log(`Skipping block ${index + 1} - missing question text or options`);
      }
    });

    console.log('Final parsed questions count:', questions.length);
    return questions;
  };

  const handleSummarize = async () => {
    if (!url) return alert("Please paste a YouTube URL first.");
    setLoading(true);

    try {
      // 1. Start the session
      const startResponse = await API.post("/session/start", { videoUrl: url });
      const { sessionId, videoId } = startResponse.data;
      // 2. Poll for transcript and summary
      const poll = async () => {
        try {
          // Fetch transcript with query parameters
          const [transcriptRes, summaryRes] = await Promise.all([
            API.get("/session/transcript", {
              params: { sessionId, videoId }
            }),
            API.get("/session/summary", {
              params: { sessionId, videoId }
            })
          ]);
          if (transcriptRes.data.success && summaryRes.data.success) {
            // Handle transcript format
            const transcript = transcriptRes.data.transcript || [];
            const formattedTranscript = typeof transcript === 'string'
              ? [{ text: transcript, time: '00:00' }]
              : transcript;

            setTranscript(formattedTranscript);
            setSummary(summaryRes.data.summary);
            await generateQuiz(formattedTranscript, summaryRes.data.summary);
            setLoading(false);
          } else {
            // If not ready, poll again after a delay
            setTimeout(poll, 2000);
          }
        } catch (error) {
          console.error("Error polling for data:", error);
          setLoading(false);
        }
      };
      // Start polling
      poll();
    } catch (error) {
      console.error("Error starting session:", error);
      setLoading(false);
    }
  };

  const fetchTranscript = async (sessionId, videoId) => {
    try {
      const res = await API.get("/session/transcript", {
        params: { sessionId, videoId }
      });
      const transcript = res.data.transcript || [];

      // Convert string transcript to array format if needed
      if (typeof transcript === 'string') {
        return [{ text: transcript, time: '00:00' }];
      }

      return transcript;
    } catch (err) {
      console.error("Error fetching transcript:", err);
      return [];
    }
  };

  const fetchSummary = async (sessionId, videoId) => {
    try {
      const res = await API.get("/session/summary", {
        params: { sessionId, videoId }
      });
      return res.data.summary || "";
    } catch (err) {
      console.error("Error fetching summary:", err);
      return "";
    }
  };

  const handleGetTranscript = async () => {
    if (!url) return alert("Please paste a YouTube URL first.");
    setLoading(true);
    try {
      // Start a session first to get sessionId and videoId
      const startResponse = await API.post("/session/start", { videoUrl: url });
      const { sessionId, videoId } = startResponse.data;

      // Now fetch transcript with the required parameters
      const t = await fetchTranscript(sessionId, videoId);
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
      const startResponse = await API.post("/session/start", { videoUrl: url });
      // Get sessionId and videoId from the session start response
      const { sessionId, videoId } = startResponse.data;
      const s = await fetchSummary(sessionId, videoId);
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
      const payload = { videoUrl: url };
      if (t && t.length) payload.transcript = t;
      if (s) payload.summary = s;
      try {
        const res = await API.post("/quiz/generate", payload);
        console.log('Quiz API response:', res.data);
        let q = res.data.quiz || res.data.questions || [];
        console.log('Extracted questions:', q);
        console.log('Questions type:', typeof q);
        console.log('Is array?', Array.isArray(q));

        // Parse string format into array of objects if needed
        if (typeof q === 'string') {
          console.log('Parsing string quiz format into array...');
          const parsedQuestions = parseQuizString(q);
          console.log('Parsed questions:', parsedQuestions);
          q = parsedQuestions;
        }

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
                    src={`https://www.youtube.com/embed/${(function () { try { const u = new URL(url); const p = u.searchParams.get('v'); if (p) return p; const path = u.pathname.split('/'); return path[path.length - 1]; } catch (e) { return '' } })()}`}
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
              <VideoInput url={url} setUrl={setUrl} onSummarize={handleSummarize} />

              <div style={{ marginTop: 12, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button type="button" className="primary-btn" onClick={handleGetTranscript}>
                  {loading ? 'Working...' : 'Get Transcript'}
                </button>
                <button type="button" className="primary-btn" onClick={handleGenerateSummary}>
                  {loading ? 'Working...' : 'Generate Summary'}
                </button>
              </div>
            </div>
            
             <aside className="right">
            <div className="quiz-panel card">
              <Quiz key={questions.length} questions={questions} onGenerate={() => generateQuiz()} />
            </div>
          </aside>
          </section>
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
         
        </main>



      </div>
      <ChatModal initialMessages={chatMessages} />
    </>
  );
}
