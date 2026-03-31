from sqlalchemy.orm import Session
from app.models.feedback import Feedback
from sqlalchemy import func
from datetime import datetime, timedelta


class AnalyticsService:

    def __init__(self, db: Session):
        self.db = db

    def get_feedback_stats(self):
        total    = self.db.query(Feedback).count()
        positive = self.db.query(Feedback).filter(Feedback.feedback == "up").count()
        negative = self.db.query(Feedback).filter(Feedback.feedback == "down").count()
        success_rate = (positive / total) * 100 if total > 0 else 0

        return {
            "total":        total,
            "positive":     positive,
            "negative":     negative,
            "success_rate": round(success_rate, 2),
        }

    def analyze_tool_performance(self):
        all_data   = self.db.query(Feedback).all()
        tool_stats = {}

        for row in all_data:
            tool = row.selected_tool or "unknown"
            if tool not in tool_stats:
                tool_stats[tool] = {"total": 0, "positive": 0, "negative": 0}

            tool_stats[tool]["total"] += 1
            if row.feedback == "up":
                tool_stats[tool]["positive"] += 1
            elif row.feedback == "down":
                tool_stats[tool]["negative"] += 1

        results = {}
        for tool, stats in tool_stats.items():
            total    = stats["total"]
            positive = stats["positive"]
            accuracy = (positive / total) * 100 if total > 0 else 0
            results[tool] = {
                "total":    total,
                "positive": positive,
                "negative": stats["negative"],
                "accuracy": round(accuracy, 2),
            }

        sorted_tools = sorted(results.items(), key=lambda x: x[1]["accuracy"], reverse=True)
        best_tool  = sorted_tools[0]  if sorted_tools else None
        worst_tool = sorted_tools[-1] if sorted_tools else None

        return {
            "tool_performance": results,
            "best_tool":        best_tool,
            "worst_tool":       worst_tool,
        }

    def get_rewrite_effectiveness(self):
        """
        Calculate query rewrite effectiveness from all feedback.
        """
        data  = self.db.query(Feedback).all()
        total = 0
        improved      = 0
        same          = 0
        missing       = 0
        rewrite_lens  = []
        original_lens = []

        for row in data:
            if not row.query:
                continue
            total += 1

            original  = row.query.strip()
            rewritten = (row.rewritten_query or "").strip()

            original_lens.append(len(original.split()))

            if not rewritten:
                missing += 1
                continue

            rewrite_lens.append(len(rewritten.split()))

            if rewritten.lower() == original.lower():
                same += 1

            if row.feedback == "up":
                improved += 1

        avg_orig    = sum(original_lens) / len(original_lens) if original_lens else 0
        avg_rewrite = sum(rewrite_lens)  / len(rewrite_lens)  if rewrite_lens  else 0
        effectiveness = (improved / total) * 100 if total > 0 else 0

        return {
            "total_samples":         total,
            "improved_cases":        improved,
            "same_query_cases":      same,
            "missing_rewrites":      missing,
            "avg_original_length":   round(avg_orig,    2),
            "avg_rewrite_length":    round(avg_rewrite, 2),
            "rewrite_effectiveness": round(effectiveness, 2),
        }


    def get_dashboard_metrics(self, range: str = "7d"):
        days       = 7 if range == "7d" else 30
        start_date = datetime.utcnow() - timedelta(days=days)

        base_query = self.db.query(Feedback).filter(Feedback.created_at >= start_date)

        # Core counts
        total    = base_query.count()
        positive = base_query.filter(Feedback.feedback == "up").count()
        negative = base_query.filter(Feedback.feedback == "down").count()
        success_rate = (positive / total * 100) if total else 0

        # Trends
        trends_raw = (
            self.db.query(func.date(Feedback.created_at), func.count())
            .filter(Feedback.created_at >= start_date)
            .group_by(func.date(Feedback.created_at))
            .all()
        )
        trends = [{"date": str(t[0]), "count": t[1]} for t in trends_raw]

        # Tool usage (count per tool in date range)
        tool_usage_raw = (
            self.db.query(Feedback.selected_tool, func.count())
            .filter(Feedback.created_at >= start_date)
            .group_by(Feedback.selected_tool)
            .all()
        )
        tool_usage = [{"tool": t[0] or "unknown", "count": t[1]} for t in tool_usage_raw]

        #Tool performance (ALL time — accurate stats)
        tool_perf = self.analyze_tool_performance()

        #Sessions 
        sessions_raw = (
            self.db.query(Feedback.session_id, func.count())
            .filter(Feedback.created_at >= start_date)
            .group_by(Feedback.session_id)
            .all()
        )
        sessions = [{"session_id": s[0], "queries": s[1]} for s in sessions_raw]

        #Users
        users_raw = (
            self.db.query(Feedback.user_id, func.count())
            .filter(Feedback.created_at >= start_date)
            .group_by(Feedback.user_id)
            .all()
        )
        users = [{"user_id": u[0], "queries": u[1]} for u in users_raw]

        #Models (avg confidence per model)
        models_raw = (
            self.db.query(Feedback.model, func.avg(Feedback.confidence_score))
            .filter(Feedback.created_at >= start_date)
            .group_by(Feedback.model)
            .all()
        )
        models = [
            {"model": m[0] or "unknown", "accuracy": round(float(m[1] or 0), 2)}
            for m in models_raw
        ]

        #Top failed queries
        failed_raw = (
            self.db.query(Feedback.query, func.count())
            .filter(Feedback.feedback == "down", Feedback.created_at >= start_date)
            .group_by(Feedback.query)
            .order_by(func.count().desc())
            .limit(5)
            .all()
        )
        top_failed_queries = [{"query": f[0], "count": f[1]} for f in failed_raw]

        # Feedback logs 
        feedback_logs_raw = (
            self.db.query(Feedback)
            .order_by(Feedback.created_at.desc())
            .limit(50)
            .all()
        )
        feedback_logs = [
            {
                "query":            f.query,
                "feedback":         f.feedback,
                "tool":             f.selected_tool,
                "model":            f.model,
                "confidence_score": f.confidence_score,
                "latency_ms":       f.latency_ms,
                "rewritten_query":  f.rewritten_query,
                "session_id":       f.session_id,
                "user_id":          f.user_id,
                "created_at":       str(f.created_at) if f.created_at else None,
            }
            for f in feedback_logs_raw
        ]

        #Rewrite effectiveness 
        rewrite_effectiveness = self.get_rewrite_effectiveness()

        return {
            "total":        total,
            "positive":     positive,
            "negative":     negative,
            "success_rate": round(success_rate, 2),

            "trends":    trends,
            "tool_usage": tool_usage,

            # NOW INCLUDED
            "tool_performance":     tool_perf.get("tool_performance", {}),
            "best_tool":            tool_perf.get("best_tool"),
            "worst_tool":           tool_perf.get("worst_tool"),

            "sessions": sessions,
            "users":    users,
            "models":   models,

            "feedback_logs":        feedback_logs,
            "top_failed_queries":   top_failed_queries,

            # NOW INCLUDED
            "rewrite_effectiveness": rewrite_effectiveness,
        }

    def get_failure_cases_by_tool(self, tool_name):
        if not tool_name:
            return {"tool": None, "total_failures": 0, "cases": [], "insights": {}}

        failures = (
            self.db.query(Feedback)
            .filter(
                Feedback.selected_tool == tool_name,
                Feedback.feedback == "down",
            )
            .order_by(Feedback.created_at.desc())
            .limit(200)
            .all()
        )

        cases            = []
        short_answers    = 0
        missing_rewrites = 0

        for f in failures:
            cases.append({
                "query":           f.query,
                "rewritten_query": f.rewritten_query,
                "answer":          f.answer,
                "confidence_score": f.confidence_score,
                "latency_ms":      f.latency_ms,
            })

            if not f.rewritten_query or not f.rewritten_query.strip():
                missing_rewrites += 1
            if f.answer and len(f.answer.split()) < 5:
                short_answers += 1

        return {
            "tool":           tool_name,
            "total_failures": len(failures),
            "cases":          cases[:20],
            "insights": {
                "missing_rewrites": missing_rewrites,
                "short_answers":    short_answers,
            },
        }