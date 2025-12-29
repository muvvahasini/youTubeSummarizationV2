from transcript_extracter.transcript import fetch_youtube_transcript, extract_video_id
from rag.gemini_client import generate_text
def generate_questions(retrieved_chunks: list) -> str:
    """
    Generate questions from transcript chunks.
    
    Args:
        retrieved_chunks: List of transcript chunks with 'text', 'start_time', 'end_time'
        
    Returns:
        Formatted string with MCQs and descriptive questions
    """
    context = "\n\n".join(
        f"[{c.get('start_time', 'N/A')} - {c.get('end_time', 'N/A')}]\n{c.get('text', '')}"
        for c in retrieved_chunks
        if isinstance(c, dict)
    )
    prompt = f"""
You are an educational assistant. From the following video transcript content:
1. Generate exactly 5 multiple choice questions (MCQs)
   - Each MCQ should have 4 options (A, B, C, D)
   - Clearly indicate the correct answer
2. Generate exactly 5 descriptive (short-answer) questions
Use ONLY the given content.
Do NOT add information outside the transcript.
Transcript:
{context}
Format the response clearly with headings:
MCQs:
1. [Question]
   A) [Option A]
   B) [Option B]
   C) [Option C]
   D) [Option D]
   Correct Answer: [Letter]
Descriptive Questions:
1. [Question]
"""
    output = generate_text(prompt)
    return output