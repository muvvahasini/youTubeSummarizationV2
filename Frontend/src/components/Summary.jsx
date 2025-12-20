import API from "../api/backend";
import { useEffect, useState } from "react";

export default function Summary({ summary: propSummary }) {
  const [summary, setSummary] = useState(propSummary || "");

  useEffect(() => {
    if (propSummary !== undefined) return; // parent controls summary
    API.get("/session/summary").then((res) => {
      setSummary(res.data.summary);
    });
  }, [propSummary]);

  return (
    <div className="summary-card card">
      <div className="summary-header">
        <h2>Summary</h2>
        <div className="summary-meta">AI • Highlights</div>
      </div>

      {summary ? (
        <div className="summary-body">
          <p className="lead">{summary}</p>
        </div>
      ) : (
        <div className="summary-body">
          <p>Summary will appear here after processing the video.</p>
        </div>
      )}

      <div className="key-topics">
        <h4>Key Topics Covered</h4>
        <ul>
          <li>Certification Process Overview</li>
          <li>Introduction to SQL AS Keyword</li>
          <li>String Functions and Concatenation</li>
          <li>Other Important SQL Functions</li>
        </ul>
      </div>
    </div>
  );
}
