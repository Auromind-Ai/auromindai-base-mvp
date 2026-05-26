from sqlalchemy.orm import Session
from app.models.feedback import Feedback
from datetime import datetime, timedelta
from sqlalchemy import func


class ReinforcementEngine:

    def __init__(self, db: Session, workspace_id):
        self.db = db
        self.workspace_id = workspace_id

    def _feedback_query(self):
        return self.db.query(Feedback).filter(Feedback.workspace_id == self.workspace_id)

    def get_feedback_count(self):
        return self._feedback_query().count()

    def store_feedback(
        self,
        query,
        rewritten_query,
        tool,
        answer,
        feedback,
        model=None,
        latency_ms=None,
        confidence_score=None,
        session_id=None,
        user_id=None
    ):

        fb = Feedback(
            workspace_id=self.workspace_id,
            query=query,
            rewritten_query=rewritten_query,
            selected_tool=tool,
            answer=answer,
            feedback=feedback,
            model=model,
            latency_ms=latency_ms,
            confidence_score=confidence_score,
            session_id=session_id,
            user_id=user_id
        )

        self.db.add(fb)
        self.db.commit()


    def validate_feedback_input(self, data):

        if not isinstance(data, dict):
            raise ValueError("Invalid input format")

        query = data.get("query")
        answer = data.get("answer")
        feedback = data.get("feedback")

        if not query or not isinstance(query, str):
            raise ValueError("Query is required")

        if not answer or not isinstance(answer, str):
            raise ValueError("Answer is required")

        if feedback not in ["up", "down"]:
            raise ValueError("Feedback must be 'up' or 'down'")

        # Normalize text
        data["query"] = query.strip()
        data["answer"] = answer.strip()

        if "rewritten_query" in data and isinstance(data["rewritten_query"], str):
            data["rewritten_query"] = data["rewritten_query"].strip()

        if "tool" in data and isinstance(data["tool"], str):
            data["tool"] = data["tool"].strip().lower()

        return data


    def get_positive_samples(self, limit=100):
        return (
            self._feedback_query()
            .filter(Feedback.feedback == "up")
            .order_by(Feedback.created_at.desc())
            .limit(limit)
            .all()
        )


    def get_negative_samples(self, limit=100):
        return (
            self._feedback_query()
            .filter(Feedback.feedback == "down")
            .order_by(Feedback.created_at.desc())
            .limit(limit)
            .all()
        )


    def extract_positive_patterns(self):
        samples = self.get_positive_samples(limit=200)

        tool_usage = {}
        query_lengths = []
        answer_lengths = []

        for s in samples:
            # Tool frequency
            tool = s.selected_tool or "unknown"
            tool_usage[tool] = tool_usage.get(tool, 0) + 1

            # Query structure (length-based simple heuristic)
            if s.query:
                query_lengths.append(len(s.query.split()))

            # Answer structure (length-based simple heuristic)
            if s.answer:
                answer_lengths.append(len(s.answer.split()))

        avg_query_length = (
            sum(query_lengths) / len(query_lengths) if query_lengths else 0
        )

        avg_answer_length = (
            sum(answer_lengths) / len(answer_lengths) if answer_lengths else 0
        )

        return {
            "top_tools": sorted(tool_usage.items(), key=lambda x: x[1], reverse=True),
            "avg_query_length": round(avg_query_length, 2),
            "avg_answer_length": round(avg_answer_length, 2),
            "total_samples": len(samples)
        }


    def extract_failure_patterns(self):
        samples = self.get_negative_samples(limit=200)

        tool_usage = {}
        short_answers = 0
        empty_rewrites = 0
        query_lengths = []
        answer_lengths = []

        for s in samples:
            # Tool frequency (potential wrong tool usage)
            tool = s.selected_tool or "unknown"
            tool_usage[tool] = tool_usage.get(tool, 0) + 1

            # Detect empty or missing rewrites
            if not s.rewritten_query or len(s.rewritten_query.strip()) == 0:
                empty_rewrites += 1

            # Query length analysis
            if s.query:
                query_lengths.append(len(s.query.split()))

            # Answer quality (very short answers = low quality signal)
            if s.answer:
                word_count = len(s.answer.split())
                answer_lengths.append(word_count)
                if word_count < 5:
                    short_answers += 1

        avg_query_length = (
            sum(query_lengths) / len(query_lengths) if query_lengths else 0
        )

        avg_answer_length = (
            sum(answer_lengths) / len(answer_lengths) if answer_lengths else 0
        )

        return {
            "tool_failure_distribution": sorted(tool_usage.items(), key=lambda x: x[1], reverse=True),
            "empty_rewrites": empty_rewrites,
            "short_answers": short_answers,
            "avg_query_length": round(avg_query_length, 2),
            "avg_answer_length": round(avg_answer_length, 2),
            "total_failures": len(samples)
        }


    def learn_tool_selection_rules(self):
        data = self._feedback_query().all()
        tool_patterns = {}

        for row in data:
            if not row.query or not row.selected_tool:
                continue

            tool = row.selected_tool
            if not tool or tool == "unknown":
                continue

            query = row.query.lower()

            if tool not in tool_patterns:
                tool_patterns[tool] = {
                    "keywords": {},
                    "positive": 0,
                    "negative": 0
                }

            if row.feedback == "up":
                tool_patterns[tool]["positive"] += 1
                
                #ONLY positive feedback queries give keywords
                words = query.split()
                for w in words:
                    if len(w) < 3:
                        continue
                    tool_patterns[tool]["keywords"][w] = \
                        tool_patterns[tool]["keywords"].get(w, 0) + 1

            elif row.feedback == "down":
                tool_patterns[tool]["negative"] += 1
                
                #Negative keywords penalize 
                words = query.split()
                for w in words:
                    if len(w) < 3:
                        continue
                    if w in tool_patterns[tool]["keywords"]:
                        tool_patterns[tool]["keywords"][w] -= 2  # penalty

        rules = []

        for tool, stats in tool_patterns.items():
            total = stats["positive"] + stats["negative"]
            success_rate = (stats["positive"] / total) * 100 if total > 0 else 0

            #Only positive-score keywords
            sorted_keywords = sorted(
                [(k, v) for k, v in stats["keywords"].items() if v > 0],
                key=lambda x: x[1],
                reverse=True
            )[:5]

            keywords = [k for k, _ in sorted_keywords]

            rules.append({
                "tool": tool,
                "success_rate": round(success_rate, 2),
                "top_keywords": keywords
            })

        return sorted(rules, key=lambda x: x["success_rate"], reverse=True)


    def analyze_rewrite_effectiveness(self):
        
        data = self._feedback_query().all()

        total = 0
        improved = 0
        same = 0
        missing = 0

        rewrite_lengths = []
        original_lengths = []

        for row in data:
            if not row.query:
                continue

            total += 1

            original = row.query.strip()
            rewritten = (row.rewritten_query or "").strip()

            original_len = len(original.split())
            original_lengths.append(original_len)

            if not rewritten:
                missing += 1
                continue

            rewritten_len = len(rewritten.split())
            rewrite_lengths.append(rewritten_len)

            if rewritten.lower() == original.lower():
                same += 1

            # Heuristic: if feedback is positive → rewrite likely helped
            if row.feedback == "up":
                improved += 1

        avg_original_len = sum(original_lengths) / len(original_lengths) if original_lengths else 0
        avg_rewrite_len = sum(rewrite_lengths) / len(rewrite_lengths) if rewrite_lengths else 0

        effectiveness = (improved / total) * 100 if total > 0 else 0

        return {
            "total_samples": total,
            "improved_cases": improved,
            "same_query_cases": same,
            "missing_rewrites": missing,
            "avg_original_length": round(avg_original_len, 2),
            "avg_rewrite_length": round(avg_rewrite_len, 2),
            "rewrite_effectiveness": round(effectiveness, 2)
        }


    def learn_rewrite_rules(self):

        data = self._feedback_query().all()

        filler_words = {
            "what", "is", "the", "a", "an", "please", "can", "you",
            "tell", "me", "about", "explain", "give", "details"
        }

        remove_candidates = {}
        good_patterns = {}
        bad_patterns = {}

        for row in data:
            if not row.query or not row.rewritten_query:
                continue

            original_words = row.query.lower().split()
            rewritten_words = row.rewritten_query.lower().split()

            removed_words = set(original_words) - set(rewritten_words)
            added_words = set(rewritten_words) - set(original_words)

            if row.feedback == "up":
                # Track successful removals
                for w in removed_words:
                    if w in filler_words:
                        remove_candidates[w] = remove_candidates.get(w, 0) + 1

                # Track good additions (context clarity)
                for w in added_words:
                    if len(w) > 3:
                        good_patterns[w] = good_patterns.get(w, 0) + 1

            elif row.feedback == "down":
                # Track harmful removals (lost intent)
                for w in removed_words:
                    bad_patterns[w] = bad_patterns.get(w, 0) + 1

        top_remove = sorted(remove_candidates.items(), key=lambda x: x[1], reverse=True)[:10]
        top_good_add = sorted(good_patterns.items(), key=lambda x: x[1], reverse=True)[:10]
        top_bad_remove = sorted(bad_patterns.items(), key=lambda x: x[1], reverse=True)[:10]

        return {
            "remove_words": [w for w, _ in top_remove],
            "good_additions": [w for w, _ in top_good_add],
            "avoid_removing": [w for w, _ in top_bad_remove]
        }


    def evaluate_answer_quality(self, answer, feedback):
       
        if not answer or not isinstance(answer, str):
            return {
                "quality_score": 0,
                "is_valid": False,
                "issues": ["empty_answer"]
            }

        text = answer.strip()
        word_count = len(text.split())

        issues = []

        # Detect very short / incomplete answers
        if word_count < 5:
            issues.append("too_short")

        # Detect generic fallback responses
        fallback_phrases = [
            "not available",
            "cannot find",
            "no information",
            "unable to",
            "no data"
        ]

        if any(p in text.lower() for p in fallback_phrases):
            issues.append("fallback_response")

        # Detect possible hallucination (heuristic: very long + no structure)
        if word_count > 150 and "." not in text:
            issues.append("possible_hallucination")

        # Base score
        score = 50

        # Adjust based on feedback
        if feedback == "up":
            score += 30
        elif feedback == "down":
            score -= 30

        # Adjust based on issues
        score -= len(issues) * 10

        # Clamp score
        score = max(0, min(100, score))

        return {
            "quality_score": score,
            "is_valid": score > 40,
            "issues": issues,
            "word_count": word_count
        }


    def generate_prompt_improvements(self):
        
        positives = self.get_positive_samples(limit=200)
        negatives = self.get_negative_samples(limit=200)

        # Collect signals
        tool_success = {}
        tool_failure = {}
        rewrite_missing = 0
        short_answers = 0
        fallback_answers = 0

        fallback_phrases = [
            "not available",
            "cannot find",
            "no information",
            "unable to",
            "no data"
        ]

        for row in positives:
            tool = row.selected_tool or "unknown"
            tool_success[tool] = tool_success.get(tool, 0) + 1

        for row in negatives:
            tool = row.selected_tool or "unknown"
            tool_failure[tool] = tool_failure.get(tool, 0) + 1

            # Missing rewrite
            if not row.rewritten_query or not row.rewritten_query.strip():
                rewrite_missing += 1

            # Short answers
            if row.answer and len(row.answer.split()) < 5:
                short_answers += 1

            # Fallback answers
            if row.answer and any(p in row.answer.lower() for p in fallback_phrases):
                fallback_answers += 1

        # Generate improvements
        improvements = {
            "rewrite_prompt": [],
            "tool_selection_prompt": [],
            "answer_generation_prompt": []
        }

        # Rewrite improvements
        if rewrite_missing > 0:
            improvements["rewrite_prompt"].append(
                "Ensure every query is rewritten unless it is already optimal."
            )

        # Tool selection improvements
        for tool, fail_count in tool_failure.items():
            success_count = tool_success.get(tool, 0)
            if fail_count > success_count:
                improvements["tool_selection_prompt"].append(
                    f"Reduce incorrect usage of '{tool}' and refine routing conditions."
                )

        # Answer generation improvements
        if short_answers > 0:
            improvements["answer_generation_prompt"].append(
                "Avoid very short answers. Provide complete and meaningful responses."
            )

        if fallback_answers > 0:
            improvements["answer_generation_prompt"].append(
                "Avoid generic fallback phrases unless absolutely necessary."
            )

        return improvements


    def build_reinforcement_memory(self):

        positives = self.get_positive_samples(limit=200)
        negatives = self.get_negative_samples(limit=200)

        good_queries = []
        bad_queries = []
        tool_insights = {}

        #Process positive samples
        for row in positives:
            if row.query:
                good_queries.append(row.query)

            tool = row.selected_tool or "unknown"
            if tool not in tool_insights:
                tool_insights[tool] = {"positive": 0, "negative": 0}

            tool_insights[tool]["positive"] += 1

        #Process negative samples
        for row in negatives:
            if row.query:
                bad_queries.append(row.query)

            tool = row.selected_tool or "unknown"
            if tool not in tool_insights:
                tool_insights[tool] = {"positive": 0, "negative": 0}

            tool_insights[tool]["negative"] += 1

        #Build final memory
        memory = {
            "good_queries": good_queries[:50],
            "bad_queries": bad_queries[:50],
            "tool_insights": tool_insights
        }

        return memory


    def adjust_pipeline(self, query, rewritten_query, tool):
        negatives = self.get_negative_samples(limit=200)
        positives = self.get_positive_samples(limit=200)
        query_words = set(query.lower().split())

        similar_failures = []
        for row in negatives:
            if not row.query:
                continue
            past_words = set(row.query.lower().split())
            overlap = len(query_words.intersection(past_words))
            if overlap >= 2:
                similar_failures.append(row)

        tool_failure_count = {}
        for f in similar_failures:
            t = f.selected_tool or "unknown"
            tool_failure_count[t] = tool_failure_count.get(t, 0) + 1

        # Current tool failure count 
        current_tool_failures = tool_failure_count.get(tool, 0)
        if current_tool_failures < 2:
            return {
                "query": query,
                "rewritten_query": rewritten_query,
                "tool": tool, 
                "adjusted": False
            }

        # Similar SUCCESS cases
        similar_successes = []
        for row in positives:
            if not row.query:
                continue
            past_words = set(row.query.lower().split())
            overlap = len(query_words.intersection(past_words))
            if overlap >= 2:
                similar_successes.append(row)

        tool_success_count = {}
        for s in similar_successes:
            t = s.selected_tool or "unknown"
            tool_success_count[t] = tool_success_count.get(t, 0) + 1

        # Best tool = most successes AND least failures
        candidate_tools = [
            "web_search", "vector_db", "reasoning",
            "direct_answer", "calculator"
        ]
        candidate_tools = [t for t in candidate_tools if t != tool]

        best_tool = None
        best_score = -float("inf")

        for t in candidate_tools:
            successes = tool_success_count.get(t, 0)
            failures = tool_failure_count.get(t, 0)
            score = successes - failures  
            if score > best_score:
                best_score = score
                best_tool = t

        # Override only if best_tool actually has positive evidence
        tool_override = best_tool if best_score > 0 else None

        improved_rewrite = rewritten_query
        if similar_failures:
            empty_rewrite_cases = [
                f for f in similar_failures if not f.rewritten_query
            ]
            if empty_rewrite_cases and (not rewritten_query or not rewritten_query.strip()):
                improved_rewrite = query

        return {
            "query": query,
            "rewritten_query": improved_rewrite,
            "tool": tool_override or tool, 
            "adjusted": bool(tool_override)
        }
    
    def run_learning_cycle(self):
       
        positive_patterns = self.extract_positive_patterns()
        failure_patterns = self.extract_failure_patterns()

        tool_rules = self.learn_tool_selection_rules()
        rewrite_rules = self.learn_rewrite_rules()

        memory = self.build_reinforcement_memory()

        return {
            "positive_patterns": positive_patterns,
            "failure_patterns": failure_patterns,
            "tool_rules": tool_rules,
            "rewrite_rules": rewrite_rules,
            "memory": memory
        }


    def update_weights_from_feedback(self):
       
        data = self._feedback_query().all()

        tool_weights = {}
        query_weights = {}

        for row in data:
            score = 1 if row.feedback == "up" else -1

            # Tool scoring
            tool = row.selected_tool or "unknown"
            tool_weights[tool] = tool_weights.get(tool, 0) + score

            #Query scoring (simple pattern memory)
            if row.query:
                key = row.query.strip().lower()
                query_weights[key] = query_weights.get(key, 0) + score

        return {
            "tool_weights": tool_weights,
            "query_weights": query_weights
        }
