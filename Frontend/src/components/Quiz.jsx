import API from "../api/backend";
import { useState, useEffect } from "react";

export default function Quiz({ questions: propQuestions, onGenerate }) {
  const [quiz, setQuiz] = useState(propQuestions || []);
  const [answers, setAnswers] = useState({});

  useEffect(() => {
    if (propQuestions) setQuiz(propQuestions);
  }, [propQuestions]);

  const generateQuiz = async () => {
    if (onGenerate) {
      await onGenerate();
      return;
    }

    try {
      const res = await API.post("/quiz/generate");
      setQuiz(res.data.quiz || []);
    } catch (e) {
      console.error(e);
    }
  };

  const exportReport = async () => {
    try {
      const res = await API.get("/export/pdf", { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      window.open(url);
    } catch (e) {
      console.error("Export failed", e);
      alert("Failed to download report.");
    }
  };

  const selectOption = (qIdx, optIdx) => {
    setAnswers((s) => ({ ...s, [qIdx]: optIdx }));
  };

  return (
    <div className="card quiz-card">
      <div className="quiz-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Quiz</h3>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button type="button" className="primary-btn" onClick={generateQuiz}>Generate</button>
          <button type="button" className="export-btn" onClick={exportReport}>Download PDF</button>
        </div>
      </div>

      {quiz.length === 0 && <p className="muted">No questions yet. Click Generate or upload a video.</p>}

      {quiz.map((q, i) => (
        <div key={i} className="quiz-item" style={{ padding: 12, marginBottom: 10, background: "rgba(255,255,255,0.01)", borderRadius: 8 }}>
          <div style={{ marginBottom: 8 }}><strong>Q{i + 1}.</strong> {q.question}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {q.options && q.options.map((opt, oi) => (
              <label key={oi} style={{ display: "flex", gap: 10, alignItems: "center", cursor: "pointer" }}>
                <input
                  type="radio"
                  name={`q-${i}`}
                  checked={answers[i] === oi}
                  onChange={() => selectOption(i, oi)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
