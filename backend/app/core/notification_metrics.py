"""Notification metrics tracker module — extends core observability."""

import logging
from typing import Dict, Any

logger = logging.getLogger("auromind.notification_metrics")

class NotificationMetricsTracker:
    def __init__(self):
        self._metrics = {
            "notifications_sent_total": 0,
            "notifications_failed_total": 0,
            "email_retry_count_total": 0,
            "duplicate_prevention_hits_total": 0,
            "audit_logs_created_total": 0,
        }

    def increment(self, metric_name: str, count: int = 1):
        if metric_name in self._metrics:
            self._metrics[metric_name] += count
            logger.debug(f"[NOTIFICATION_METRICS] {metric_name} = {self._metrics[metric_name]}")

    def get_metrics(self) -> Dict[str, Any]:
        return self._metrics.copy()

    def reset_metrics(self):
        for k in self._metrics:
            self._metrics[k] = 0


# Global Singleton Notification Metrics Tracker
notification_metrics = NotificationMetricsTracker()
