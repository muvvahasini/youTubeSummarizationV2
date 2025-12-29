from rag.gemini_client import generate_text


def evaluate_answers(questions: str, user_answers: dict):
    """
    questions: generated questions text
    user_answers: dict with question number as key and answer as value
    """

    formatted_answers = "\n".join(
        f"Q{q}: {a}" for q, a in user_answers.items()
    )

    prompt = f"""
You are an intelligent evaluator.

Given the following questions and correct context,
evaluate the user's answers.

Questions:
{questions}

User Answers:
{formatted_answers}

Tasks:
1. Give a score out of 10
2. Identify correct answers
3. Identify incorrect answers
4. Mention weak areas
5. Give an overall understanding level (Poor / Average / Good / Excellent)

Respond in JSON format with keys:
score, correct, incorrect, weak_areas, understanding_level
"""

    output = generate_text(prompt)
    return output