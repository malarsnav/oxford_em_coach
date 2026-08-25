import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "outputs" / "tara-tsa-practice-app" / "tsa-section1-question-bank.json"
ASSET_DIR = ROOT / "question-assets"
OUT_BANK = ROOT / "src" / "questionBank.generated.js"
OUT_MANIFEST = ROOT / "src" / "questionBankManifest.generated.js"

TYPE_MAP = {
    "Identifying the Main Conclusion": "Identifying the Main Conclusion",
    "Identifying an Assumption": "Identifying Assumptions",
    "Assessing the Impact of Additional Evidence": "Assessing Additional Evidence",
    "Detecting Flaws in Reasoning": "Detecting Reasoning Errors (Flaws)",
    "Identifying Parallel Reasoning": "Matching Arguments (Parallel Reasoning)",
    "Drawing a Conclusion": "Drawing a Conclusion",
    "Matching Principles": "Applying Principles",
}

CRITICAL_OBJECTIVES = {
    "Identifying the Main Conclusion": "Structural Analysis",
    "Identifying Assumptions": "Structural Analysis",
    "Matching Arguments (Parallel Reasoning)": "Structural Analysis",
    "Detecting Reasoning Errors (Flaws)": "Evaluative Analysis",
    "Assessing Additional Evidence": "Evaluative Analysis",
    "Drawing a Conclusion": "Evaluative Analysis",
    "Applying Principles": "Applied Logic",
}

FAMILY_MAP = {
    "Critical Reasoning": "Critical Thinking",
    "Numerical Reasoning": "Numerical Reasoning & Problem-Solving",
    "Problem Solving": "Numerical Reasoning & Problem-Solving",
}


def numerical_subtype(pattern):
    value = str(pattern or "").lower()
    if any(term in value for term in ["table", "graph", "chart", "data", "row", "column", "extract", "selection", "relevant information"]):
        return "Relevant Selection", "Data Filtering & Table Extraction"
    if any(term in value for term in ["constraint", "condition", "missing"]):
        return "Relevant Selection", "Identifying Missing Constraints"
    if any(term in value for term in ["schedule", "timetable", "gantt", "queue", "overlap"]):
        return "Spatial Reasoning & Pattern Analysis", "Timetable & Gantt/Schedule Optimization"
    if any(term in value for term in ["spatial", "rotation", "cube", "net", "block", "3d", "grid", "adjacency"]):
        return "Spatial Reasoning & Pattern Analysis", "3D Net Folding & Block Rotating"
    if any(term in value for term in ["rate", "speed", "distance", "work", "motion", "flow"]):
        return "Finding Procedures", "Work Rates & Motion Dynamics"
    if any(term in value for term in ["cost", "price", "profit", "cheap", "expensive", "optim", "combination", "combinatoric", "bottleneck", "maximum", "minimum"]):
        return "Finding Procedures", "Cost-Optimization & Combinatorics"
    if any(term in value for term in ["pattern", "sequence", "cycle", "logic", "similarity", "abstract"]):
        return "Spatial Reasoning & Pattern Analysis", "Abstract Pattern Logic"
    return "Finding Procedures", "Rate, Ratio & Multi-step Arithmetic"


def difficulty_tier(item, family, subtype, has_visual):
    raw_difficulty = str(item.get("difficulty", "")).lower()
    question_length = len(item.get("question", ""))
    base = 4 if raw_difficulty == "hard" else 1 if raw_difficulty == "easy" else 3
    if raw_difficulty != "hard" and not has_visual:
        if subtype == "Identifying the Main Conclusion" and question_length < 850:
            base = 1
        elif family == "Critical Thinking" and question_length < 700:
            base = 2
        elif family == "Numerical Reasoning & Problem-Solving" and question_length < 350:
            base = 2
    bump = 1 if has_visual or subtype == "Spatial Reasoning & Pattern Analysis" or question_length > 900 else 0
    numerical_ease_adjustment = -1 if family == "Numerical Reasoning & Problem-Solving" and subtype != "Spatial Reasoning & Pattern Analysis" else 0
    return max(1, min(4, base + bump + numerical_ease_adjustment))


def difficulty_label(tier):
    return {
        1: "Easy",
        2: "Moderately Easy",
        3: "Moderately Difficult",
        4: "Hard",
    }.get(tier, "Moderately Difficult")


def time_budget_seconds(family, subtype, has_visual):
    if family == "Critical Thinking":
        if subtype == "Identifying the Main Conclusion":
            return 55
        if subtype == "Matching Arguments (Parallel Reasoning)":
            return 105
        return 75
    if subtype == "Relevant Selection":
        return 115 if has_visual else 95
    if subtype == "Spatial Reasoning & Pattern Analysis":
        return 140
    return 110


def distractor_analysis(options, answer, question):
    text = str(question or "").lower()
    reasons = {}
    for label in ["A", "B", "C", "D", "E"][:len(options)]:
        if label == answer:
            reasons[f"option_{label}"] = "Correct"
        elif any(term in text for term in ["table", "graph", "chart"]):
            reasons[f"option_{label}"] = "Likely uses the wrong row, column, chart label or extracted value."
        elif any(term in text for term in ["must", "cannot", "at least", "at most"]):
            reasons[f"option_{label}"] = "Likely violates or overlooks one of the constraints."
        elif any(term in text for term in ["conclusion", "flaw", "assumption"]):
            reasons[f"option_{label}"] = "Plausible distractor, but it does not perform the exact logical task asked."
        else:
            reasons[f"option_{label}"] = f"Plausible distractor {label}; check which condition it fails."
    return reasons


def em_concept_link(family, topic_tag, subtype):
    if topic_tag == "Cost-Optimization & Combinatorics":
        return "Opportunity Cost / Resource Allocation"
    if topic_tag == "Data Filtering & Table Extraction":
        return "Evidence Selection / Data Use"
    if topic_tag == "Rate, Ratio & Multi-step Arithmetic":
        return "Marginal Change / Proportional Reasoning"
    if subtype == "Relevant Selection":
        return "Decision-Making Under Constraints"
    if family == "Critical Thinking":
        return "Argument Evaluation / Evidence Quality"
    return "Structured Problem Solving"


def method_text(subtype, topic_tag):
    methods = {
        "Identifying the Main Conclusion": "Separate background, reasons and examples from the author's central claim.",
        "Drawing a Conclusion": "Use only the stated evidence and choose the narrowest claim that must follow.",
        "Identifying Assumptions": "Find the conclusion, find the reasons, then test the missing bridge with the negation test.",
        "Detecting Reasoning Errors (Flaws)": "Name the leap from evidence to conclusion and attack that exact bridge.",
        "Assessing Additional Evidence": "Ask whether the new information strengthens or weakens the link to the conclusion.",
        "Applying Principles": "Extract the general rule, then apply that rule to a new case.",
        "Matching Arguments (Parallel Reasoning)": "Ignore topic similarity and match the underlying argument structure.",
        "Relevant Selection": "Read the target first, extract only the necessary data or constraints, and ignore distractors.",
        "Finding Procedures": "Choose the strategy before calculating: equation, ratio, rate, optimisation or case testing.",
        "Spatial Reasoning & Pattern Analysis": "Turn the visual, timetable or pattern into constraints and eliminate impossible cases.",
    }
    topic_methods = {
        "Cost-Optimization & Combinatorics": "Identify the limiting constraint, then test the feasible boundary cases.",
        "Work Rates & Motion Dynamics": "Convert each rate into a common unit before combining movement or work.",
        "Data Filtering & Table Extraction": "Locate the exact row, column or chart value needed for the target question.",
        "Timetable & Gantt/Schedule Optimization": "Convert events into intervals and compare overlaps, waiting time or feasible slots.",
        "3D Net Folding & Block Rotating": "Track adjacency, opposite faces and impossible rotations step by step.",
        "Identifying Missing Constraints": "List each condition and reject any option that violates even one of them.",
    }
    return topic_methods.get(topic_tag) or methods.get(subtype) or "Apply the named TSA method before considering attractive answer choices."


def fresh_explanation(answer, family, subtype, topic_tag):
    return (
        f"Official answer: {answer}. This question is tagged as {family}; sub-type: {subtype}; "
        f"topic tag: {topic_tag}. Method: {method_text(subtype, topic_tag)} "
        "Use the highlighted wording to identify the task, then use the distractor analysis to understand why plausible wrong options fail."
    )


def option_object(options):
    labels = ["A", "B", "C", "D", "E"]
    return {label: str(options[index]).strip() for index, label in enumerate(labels) if index < len(options)}


def normalize_question(item):
    visual_assets = []
    for visual in item.get("visuals", []) or []:
        name = Path(visual.get("src", "")).name
        if name and (ASSET_DIR / name).exists():
            visual_assets.append({
                "src": f"question-assets/{name}",
                "alt": visual.get("alt") or f"{item['paper']} Question {item['questionNumber']} visual",
            })

    old_type = item.get("questionType") or item.get("type")
    family = FAMILY_MAP.get(item.get("category"), item.get("category") or "Critical Reasoning")
    pattern = item.get("specificPattern") or item.get("pattern")
    if family == "Critical Thinking":
        subtype = TYPE_MAP.get(old_type, old_type)
        topic_tag = subtype
    else:
        subtype, topic_tag = numerical_subtype(f"{pattern} {item.get('question', '')}")

    has_image = bool(visual_assets)
    tier = difficulty_tier(item, family, subtype, has_image)
    time_budget = time_budget_seconds(family, subtype, has_image)
    distractors = distractor_analysis(item.get("options", []), item.get("answer"), item.get("question", ""))
    requires_spatial = subtype == "Spatial Reasoning & Pattern Analysis" or any(term in str(pattern or "").lower() for term in ["spatial", "rotation", "cube", "net", "grid"])
    concept_link = em_concept_link(family, topic_tag, subtype)

    return {
        "id": item["id"],
        "paper": item.get("paper"),
        "paper_year": item.get("year"),
        "question_number": item.get("questionNumber"),
        "section": item.get("section", "Section 1"),
        "type": family,
        "sub_type": subtype,
        "broad_type": family,
        "topic_tag": topic_tag,
        "critical_objective": CRITICAL_OBJECTIVES.get(subtype),
        "estimated_difficulty_tier": tier,
        "estimated_difficulty_label": difficulty_label(tier),
        "time_budget_seconds": time_budget,
        "distractor_analysis": distractors,
        "has_image": has_image,
        "requires_spatial_processing": requires_spatial,
        "em_concept_link": concept_link,
        "metadata": {
            "question_id": item["id"],
            "paper_year": item.get("year"),
            "paper_name": item.get("paper") or "TSA Section 1",
            "question_num": item.get("questionNumber"),
            "broad_type": family,
            "sub_type": subtype,
            "topic_tag": topic_tag,
            "critical_objective": CRITICAL_OBJECTIVES.get(subtype),
            "estimated_difficulty_tier": tier,
            "estimated_difficulty_label": difficulty_label(tier),
            "time_budget_seconds": time_budget,
            "distractor_analysis": distractors,
            "has_image": has_image,
            "requires_spatial_processing": requires_spatial,
            "em_concept_link": concept_link,
        },
        "difficulty": item.get("difficulty", "Medium"),
        "question_text": item.get("question", "").strip(),
        "answer_options": option_object(item.get("options", [])),
        "correct_answer": item.get("answer"),
        "explanation": fresh_explanation(item.get("answer"), family, subtype, topic_tag),
        "methodology": method_text(subtype, topic_tag),
        "relevant_question_highlights": item.get("keyParts") or [],
        "coaching_steps": item.get("coachingMethod") or [],
        "visuals": visual_assets,
    }


def main():
    raw = json.loads(SOURCE.read_text(encoding="utf-8"))
    questions = [normalize_question(item) for item in raw]
    manifest = {
        "totalQuestions": len(questions),
        "years": sorted({str(q["paper_year"]) for q in questions}, key=lambda value: (value == "specimen", value)),
        "visualQuestionCount": sum(1 for q in questions if q["visuals"]),
        "broadTypes": sorted({q["broad_type"] for q in questions}),
        "subTypes": sorted({q["sub_type"] for q in questions}),
        "topicTags": sorted({q["topic_tag"] for q in questions if q.get("topic_tag")}),
        "difficultyTiers": [
            {"tier": 1, "label": "Easy"},
            {"tier": 2, "label": "Moderately Easy"},
            {"tier": 3, "label": "Moderately Difficult"},
            {"tier": 4, "label": "Hard"},
        ],
        "criticalThinkingObjectives": sorted({q["critical_objective"] for q in questions if q.get("critical_objective")}),
        "problemSolvingModes": sorted({q["sub_type"] for q in questions if q["broad_type"] == "Numerical Reasoning & Problem-Solving"}),
    }

    OUT_BANK.write_text(
        "// Generated by scripts/import-question-bank.py. Do not edit manually.\n"
        f"export const generatedQuestionBank = {json.dumps(questions, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    OUT_MANIFEST.write_text(
        "// Generated by scripts/import-question-bank.py. Do not edit manually.\n"
        f"export const questionBankManifest = {json.dumps(manifest, ensure_ascii=False, indent=2)};\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
