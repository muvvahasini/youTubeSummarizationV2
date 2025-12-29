from typing import Dict, List, Union
from rag.gemini_client import generate_text

def generate_summary(retrieved_chunks: list) -> Dict[str, Union[str, List[str]]]:
    """
    Generate a structured summary with both a friendly paragraph and bullet points.
    
    Args:
        retrieved_chunks: List of transcript chunks with 'text', 'start_time', and 'end_time'
        
    Returns:
        Dictionary with 'paragraph' (str) and 'bullets' (List[str])
    """
    if not retrieved_chunks:
        return {
            "paragraph": "No content available to summarize.",
            "bullets": ["No content available"]
        }
    try:
        # Create context from transcript chunks
        context = "\n\n".join(
            f"[{c.get('start_time', 'N/A')} - {c.get('end_time', 'N/A')}]\n{c.get('text', '')}"
            for c in retrieved_chunks
            if isinstance(c, dict)
        )
        # Generate bullet points first
        bullet_prompt = f"""
Create 5-7 concise bullet points that summarize the key points from this YouTube video transcript.
Each bullet should be 1-2 sentences maximum.
Focus on the main ideas, key insights, and important details.
Transcript:
{context}
"""
        bullet_response = generate_text(bullet_prompt)
        
        # Format bullet points
        if isinstance(bullet_response, str):
            bullets = [
                line.strip("-•* ").strip() 
                for line in bullet_response.split("\n") 
                if line.strip()
            ]
        elif isinstance(bullet_response, list):
            bullets = [str(item).strip("-•* ").strip() for item in bullet_response if str(item).strip()]
        else:
            bullets = [str(bullet_response).strip()]
        # Generate a friendly paragraph summary
        paragraph_prompt = f"""
Write a friendly, engaging paragraph (4-6 sentences) that summarizes this YouTube video 
in a conversational tone as if you're explaining it to a friend. 
Keep it clear, concise, and easy to understand.
Key points to include:
{bullet_response}
"""
        paragraph = generate_text(paragraph_prompt)
        if not isinstance(paragraph, str):
            paragraph = " ".join(str(p) for p in paragraph) if isinstance(paragraph, (list, tuple)) else str(paragraph)
        return {
            "paragraph": paragraph.strip(),
            "bullets": bullets
        }
    except Exception as e:
        error_msg = f"Error generating summary: {str(e)}"
        return {
            "paragraph": error_msg,
            "bullets": [error_msg]
        }