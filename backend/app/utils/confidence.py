from app.utils.evaluation import token_match_percentage
from app.models.feedback import Feedback

# Static fallback (no feedback data)
TOOL_CONFIDENCE_DEFAULT = {
    "vector_db": 0.9,
    "web_search": 0.7,
    "direct_storage": 0.95,
    "calculator": 1.0,
    "direct_answer": 0.6,
    "reasoning": 0.5
}

def get_dynamic_tool_confidence(db=None):

    if db is None:
        return TOOL_CONFIDENCE_DEFAULT

    try:
        all_feedback = db.query(Feedback).all()

        if not all_feedback:
            return TOOL_CONFIDENCE_DEFAULT

        tool_stats = {}

        for row in all_feedback:
            tool = row.selected_tool or "unknown"

            if tool not in tool_stats:
                tool_stats[tool] = {"positive": 0, "total": 0}

            tool_stats[tool]["total"] += 1

            if row.feedback == "up":
                tool_stats[tool]["positive"] += 1

        dynamic_scores = {}

        for tool, stats in tool_stats.items():
            total = stats["total"]
            positive = stats["positive"]

            if total < 5:
                # low data static default use 
                dynamic_scores[tool] = TOOL_CONFIDENCE_DEFAULT.get(tool, 0.5)
            else:
                # Real success rate
                success_rate = positive / total

                #Blend: 70% real data + 30% static prior
                static_prior = TOOL_CONFIDENCE_DEFAULT.get(tool, 0.5)
                blended = (success_rate * 0.7) + (static_prior * 0.3)
                dynamic_scores[tool] = round(blended, 3)

        # Static
        for tool, score in TOOL_CONFIDENCE_DEFAULT.items():
            if tool not in dynamic_scores:
                dynamic_scores[tool] = score

        return dynamic_scores

    except Exception:
        return TOOL_CONFIDENCE_DEFAULT


def compute_confidence(tool, retrieved_docs=None, answer=None, context=None, db=None):

    # Dynamic tool confidence
    tool_confidence_map = get_dynamic_tool_confidence(db)
    tool_conf = tool_confidence_map.get(tool, 0.5)

    # Retrieval score
    if retrieved_docs:
        scores = [doc.get("score", 0) for doc in retrieved_docs]
        retrieval_conf = max(scores) if scores else 0
    else:
        retrieval_conf = 0.5

    # Semantic match
    if answer and context:
        try:
            semantic_conf = token_match_percentage(answer, context) / 100
        except:
            semantic_conf = 0.5
    else:
        semantic_conf = 0.5

    # Dynamic weights
    has_real_data = retrieved_docs is not None or (answer and context)

    if has_real_data:
        confidence = (
            retrieval_conf * 0.5 +
            semantic_conf * 0.3 +
            tool_conf * 0.2
        )
    else:
        confidence = (
            retrieval_conf * 0.3 +
            semantic_conf * 0.2 +
            tool_conf * 0.5
        )

    return round(min(confidence, 1.0), 3)