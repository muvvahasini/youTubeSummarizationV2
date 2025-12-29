import json
import os
import re
from datetime import datetime


def clean_json(text: str) -> dict:
    """
    Removes ```json fences and converts to dict
    """
    cleaned = re.sub(r"```json|```", "", text).strip()
    return json.loads(cleaned)


def export_report(video_id: str, evaluation_text: str):
    report_data = clean_json(evaluation_text)

    report = {
        "video_id": video_id,
        "generated_at": datetime.now().isoformat(),
        "score": report_data["score"],
        "correct_answers": report_data["correct"],
        "incorrect_answers": report_data["incorrect"],
        "weak_areas": report_data["weak_areas"],
        "understanding_level": report_data["understanding_level"]
    }

    os.makedirs("reports", exist_ok=True)
    file_path = f"reports/{video_id}_evaluation_report.json"

    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=4)

    return file_path
