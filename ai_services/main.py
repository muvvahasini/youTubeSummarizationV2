# main.py
from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field, model_validator
from typing import Optional
import re
import json
from reports.report import export_report

# Internal imports
from rag.question_generator import generate_questions
from transcript_extracter.transcript import fetch_youtube_transcript
from ingestion.chunker import chunk_transcript
from vectorestore.retriever import retrieve_top_k
from rag.summarizer import generate_summary
from rag.evaluator import evaluate_answers
from rag.chat import chat_with_video, ChatRequest, ChatResponse


app = FastAPI(
    title="YouTube Video Summarizer",
    description="Fetch YouTube transcript and generate an AI-powered summary",
    version="1.0.0"
)


class TranscriptRequest(BaseModel):
    url: Optional[str] = Field(
        None,
        description="YouTube URL (https://www.youtube.com/watch?v=... or https://youtu.be/...)"
    )
    video_id: Optional[str] = Field(
        None,
        description="YouTube video ID (11 characters)"
    )
    language: str = "en"

    @model_validator(mode="after")
    def validate_input(self):
        if not self.url and not self.video_id:
            raise ValueError("Either 'url' or 'video_id' must be provided")
        return self

class TranscriptResponse(BaseModel):
    video_id: str
    language: str
    transcript: list
    message: str = "Transcript retrieved successfully"

@app.post("/transcript", response_model=TranscriptResponse)
async def get_transcript(request: TranscriptRequest):
    """
    Fetch and return the transcript for a YouTube video.
    """
    try:
        # 1️⃣ Resolve video_id
        video_id = request.video_id or extract_video_id(request.url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL or video ID")

        # 2️⃣ Fetch transcript
        transcript_data = fetch_youtube_transcript(video_id, language=request.language)
        if not transcript_data:
            raise HTTPException(
                status_code=404,
                detail=f"No transcript found for video '{video_id}' in language '{request.language}'"
            )

        return TranscriptResponse(
            video_id=video_id,
            language=request.language,
            transcript=transcript_data
        )

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching transcript: {str(e)}")


# -------------------------
# Request & Response Models
# -------------------------

class SummarizeRequest(BaseModel):
    url: Optional[str] = Field(
        None,
        description="Full YouTube URL (https://www.youtube.com/watch?v=... or https://youtu.be/...)"
    )
    video_id: Optional[str] = Field(
        None,
        description="YouTube video ID (11 characters)"
    )
    language: str = "en"

    @model_validator(mode="after")
    def validate_input(self):
        if not self.url and not self.video_id:
            raise ValueError("Either 'url' or 'video_id' must be provided")
        return self


class SummaryResponse(BaseModel):
    video_id: str
    language: str
    summary: str
    transcript_lines: int
    total_chunks: int
    retrieved_chunks_used: int
    message: str = "Summary generated successfully"

class ReportRequest(BaseModel):
    video_id: str = Field(..., description="YouTube video ID (11 characters)")
    evaluation_text: str = Field(..., description="The evaluation text to convert to a report")
# Add this endpoint with other route handlers
@app.post("/generate-report")
async def generate_report(request: ReportRequest):
    """
    Generate and download an evaluation report in JSON format.
    The report includes score, correct/incorrect answers, weak areas, and understanding level.
    """
    try:
        # Generate the report file
        file_path = export_report(request.video_id, request.evaluation_text)
        
        # Return the file for download
        return FileResponse(
            file_path,
            media_type='application/json',
            filename=f"evaluation_report_{request.video_id}.json"
        )
    except json.JSONDecodeError as je:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid evaluation text format: {str(je)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating report: {str(e)}"
        )
# -------------------------
# Utility Functions
# -------------------------

def extract_video_id(source: str) -> str:
    """Extract video ID from various YouTube URL formats"""
    source = source.strip()

    # Already a valid video ID
    if re.fullmatch(r"[a-zA-Z0-9_-]{11}", source):
        return source

    patterns = [
        r"v=([0-9A-Za-z_-]{11})",
        r"youtu\.be/([0-9A-Za-z_-]{11})",
        r"embed/([0-9A-Za-z_-]{11})",
        r"shorts/([0-9A-Za-z_-]{11})",
    ]

    for pattern in patterns:
        match = re.search(pattern, source)
        if match:
            return match.group(1)

    raise ValueError("Could not extract a valid YouTube video_id from the URL")


# -------------------------
# Routes
# -------------------------

@app.get("/")
def root():
    return {
        "message": "YouTube Summarizer API is running 🚀",
        "usage": "POST /summarize with a YouTube URL or video_id"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/chat", response_model=ChatResponse)
async def chat_with_video_endpoint(request: ChatRequest):
    """
    Chat with a YouTube video using RAG (Retrieval-Augmented Generation)
    """
    try:
        # Debug logging
        print(f"Chat request received: {request}")
        print(f"video_id: {request.video_id}, question: {request.question}")
        
        # Call the chat function (validation is automatic)
        response = await chat_with_video(request)
        return response
        
    except ValueError as ve:
        print(f"Validation error: {ve}")
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        print(f"General error: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/summarize", response_model=SummaryResponse)
def summarize_video(request: SummarizeRequest):
    try:
        # 1️⃣ Resolve video_id
        video_id = request.video_id or extract_video_id(request.url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL or video ID")

        # 2️⃣ Fetch transcript
        transcript_data = fetch_youtube_transcript(video_id, language=request.language)
        if not transcript_data:
            raise HTTPException(
                status_code=404,
                detail=f"No transcript found for video '{video_id}' in language '{request.language}'"
            )

        # 3️⃣ Chunk transcript
        chunks = chunk_transcript(transcript_data)
        if not chunks:
            raise HTTPException(status_code=500, detail="Transcript chunking failed")

        # 4️⃣ Retrieve top-K relevant chunks
        retrieved_chunks = retrieve_top_k(
            chunks=chunks,
            query=(
                "Provide a clear and concise summary of the entire video, "
                "highlighting key points, events, and the main takeaway."
            ),
            k=8
        )

        # 5️⃣ Generate summary
        try:
            summary_result = generate_summary(retrieved_chunks)
            
            # Debugging: Print the summary result
            print("Summary result:", summary_result)
            
            # Ensure we have valid summary content
            if not summary_result or not isinstance(summary_result, dict):
                raise ValueError("Invalid summary format generated")
                
            paragraph = summary_result.get("paragraph", "No summary available")
            bullets = summary_result.get("bullets", [])
            
            if not isinstance(bullets, list):
                bullets = [str(bullets)] if bullets else ["No key points available"]
            
            # Join bullets with newlines
            bullet_text = "\n".join([f"• {bullet}" for bullet in bullets])
            
            # Combine paragraph and bullets
            full_summary = f"{paragraph}\n\nKey Points:\n{bullet_text}"
            
            return SummaryResponse(
                video_id=video_id,
                language=request.language,
                summary=full_summary,
                transcript_lines=len(transcript_data),
                total_chunks=len(chunks),
                retrieved_chunks_used=len(retrieved_chunks),
            )
            
        except Exception as e:
            # If summary generation fails, return a basic response with the error
            error_msg = f"Error generating summary: {str(e)}"
            print(error_msg)
            return SummaryResponse(
                video_id=video_id,
                language=request.language,
                summary="Error: Could not generate summary. Please try again later.",
                transcript_lines=len(transcript_data),
                total_chunks=len(chunks),
                retrieved_chunks_used=0,
                message=error_msg
            )

    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

class SummaryResponse(BaseModel):
    video_id: str
    language: str
    summary: str  # This will now contain both paragraph and bullets
    transcript_lines: int
    total_chunks: int
    retrieved_chunks_used: int
    message: str = "Summary generated successfully"

class QuestionRequest(BaseModel):
    url: Optional[str] = None
    video_id: Optional[str] = None
    language: str = "en"
    @model_validator(mode="after")
    def validate_input(self):
        if not self.url and not self.video_id:
            raise ValueError("Either 'url' or 'video_id' must be provided")
        return self
# Add this endpoint (place it with other route handlers)
@app.post("/questions")
def generate_video_questions(request: QuestionRequest):
    try:
        # 1️⃣ Resolve video_id
        video_id = request.video_id or extract_video_id(request.url)
        if not video_id:
            raise HTTPException(status_code=400, detail="Invalid YouTube URL or video ID")
        # 2️⃣ Fetch transcript
        transcript_data = fetch_youtube_transcript(video_id, language=request.language)
        if not transcript_data:
            raise HTTPException(
                status_code=404,
                detail=f"No transcript found for video '{video_id}' in language '{request.language}'"
            )
        # 3️⃣ Chunk transcript
        chunks = chunk_transcript(transcript_data)
        if not chunks:
            raise HTTPException(status_code=500, detail="Transcript chunking failed")
        # 4️⃣ Retrieve relevant chunks
        retrieved_chunks = retrieve_top_k(
            chunks=chunks,
            query="Generate educational questions about this content",
            k=5
        )
        
        # 5️⃣ Generate questions
        questions = generate_questions(retrieved_chunks)
        return {
            "video_id": video_id,
            "language": request.language,
            "questions": questions,
            "transcript_used": len(transcript_data),
            "chunks_used": len(retrieved_chunks)
        }
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

class EvaluateRequest(BaseModel):
    video_id: str = Field(
        ...,
        description="YouTube video ID (11 characters)"
    )
    language: str = "en"
    user_answers: dict = Field(
        ...,
        description="Dictionary with question numbers as keys and user answers as values"
    )


class EvaluationResponse(BaseModel):
    video_id: str
    score: float
    correct_answers: list
    incorrect_answers: list
    weak_areas: list
    understanding_level: str
    feedback: str


@app.post("/evaluate", response_model=EvaluationResponse)
async def evaluate_answers_endpoint(request: EvaluateRequest):
    try:
        # 1️⃣ Fetch transcript
        transcript_data = fetch_youtube_transcript(
            request.video_id, 
            language=request.language
        )
        if not transcript_data:
            raise HTTPException(
                status_code=404,
                detail=f"No transcript found for video '{request.video_id}' in language '{request.language}'"
            )

        # 2️⃣ Chunk transcript
        chunks = chunk_transcript(transcript_data)
        if not chunks:
            raise HTTPException(status_code=500, detail="Transcript chunking failed")

        # 3️⃣ Retrieve relevant chunks for question generation
        retrieved_chunks = retrieve_top_k(
            chunks=chunks,
            query="Generate educational questions about this content",
            k=5
        )
        
        # 4️⃣ Generate questions
        questions = generate_questions(retrieved_chunks)
        
        # 5️⃣ Evaluate answers
        evaluation = evaluate_answers(questions, request.user_answers)
        
        try:
            # Try to parse the evaluation as JSON
            evaluation_data = json.loads(evaluation)
            
            # Ensure all required fields are present
            return {
                "video_id": request.video_id,
                "score": evaluation_data.get("score", 0),
                "correct_answers": evaluation_data.get("correct", []),
                "incorrect_answers": evaluation_data.get("incorrect", []),
                "weak_areas": evaluation_data.get("weak_areas", []),
                "understanding_level": evaluation_data.get("understanding_level", "Average"),
                "feedback": evaluation
            }
            
        except json.JSONDecodeError:
            # If evaluation is not valid JSON, return it as feedback
            return {
                "video_id": request.video_id,
                "score": 0,
                "correct_answers": [],
                "incorrect_answers": list(request.user_answers.keys()),
                "weak_areas": ["Evaluation format error"],
                "understanding_level": "Unknown",
                "feedback": f"Error in evaluation format: {evaluation}"
            }
            
    except HTTPException:
        raise
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)