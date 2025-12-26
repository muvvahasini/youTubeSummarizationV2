import API from "../api/backend";
import { useState, useEffect } from "react";

export default function Quiz({ questions: propQuestions, onGenerate }) {
  const [quiz, setQuiz] = useState([]);
  const [answers, setAnswers] = useState({});
  const [score, setScore] = useState(null);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    // Ensure propQuestions is an array before setting it
    if (Array.isArray(propQuestions)) {
      setQuiz(propQuestions);
    } else {
      setQuiz([]);
    }
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
      const params = new URLSearchParams();
      params.append('questions', JSON.stringify(quiz));
      params.append('answers', JSON.stringify(answers));
      if (score) params.append('score', JSON.stringify(score));

      const res = await API.get(`/export/pdf?${params.toString()}`, { responseType: "blob" });
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

  const calculateScore = () => {
    let correctCount = 0;
    quiz.forEach((question, index) => {
      if (answers[index] === question.correct) {
        correctCount++;
      }
    });
    const totalQuestions = quiz.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    setScore({ correct: correctCount, total: totalQuestions, percentage });
    setShowScore(true);
  };

  const resetQuiz = () => {
    setAnswers({});
    setScore(null);
    setShowScore(false);
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

      {showScore && score && (
        <div style={{ padding: 12, marginBottom: 16, background: "rgba(76, 175, 80, 0.1)", borderRadius: 8, border: "1px solid rgba(76, 175, 80, 0.3)" }}>
          <h4 style={{ margin: "0 0 8px 0", color: "#4CAF50" }}>Quiz Results</h4>
          <p style={{ margin: 0 }}>
            <strong>Score:</strong> {score.correct}/{score.total} ({score.percentage}%)
          </p>
          <button
            type="button"
            className="secondary-btn"
            onClick={resetQuiz}
            style={{ marginTop: 8, padding: "4px 12px", fontSize: "12px" }}
          >
            Reset Quiz
          </button>
        </div>
      )}

      {Array.isArray(quiz) && quiz.map((q, i) => (
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

      {quiz.length > 0 && !showScore && (
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          <button
            type="button"
            className="primary-btn"
            onClick={calculateScore}
            disabled={Object.keys(answers).length < quiz.length}
            style={{
              opacity: Object.keys(answers).length < quiz.length ? 0.6 : 1,
              cursor: Object.keys(answers).length < quiz.length ? 'not-allowed' : 'pointer'
            }}
          >
            Submit Quiz ({Object.keys(answers).length}/{quiz.length} answered)
          </button>
        </div>
      )}
    </div>
  );
}
