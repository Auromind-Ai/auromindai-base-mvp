import datetime
from app.core.logger import logger


class MCPService:

    def __init__(self):
        # Setup logger
        self.logger = logger

        self.logger.info("Initializing MCPService...")

        # Rule storage
        self.rule_repo = None
        self.config_service = None

        # Runtime cache
        self.rule_cache = {}

        # Audit 
        self.action_repo = None

        self.logger.info("MCPService initialized successfully")


    # MAIN ENTRY POINT
    def evaluate_action(
        self,
        workspace_id,
        action_type,
        intent,
        context,
        confidence,
        metadata=None
    ):
        try:
            self.logger.info(
                "Evaluating action",
                extra={
                    "workspace_id": str(workspace_id),
                    "action_type": action_type,
                    "confidence": confidence
                }
            )

            # Load rules
            rules = self.load_rules(workspace_id)

            action_data = {
                "workspace_id": workspace_id,
                "action_type": action_type,
                "intent": intent,
                "context": context,
                "confidence": confidence,
                "metadata": metadata or {}
            }

            rule_results = []

          
            rule_results.append(self.check_confidence(rules, confidence))
            rule_results.append(self.check_blocked_keywords(rules, context, metadata or {}))
            rule_results.append(self.check_followup_limit(rules, context, metadata or {}))
            rule_results.append(self.check_sensitive_intent(rules, intent))
            rule_results.append(self.check_high_value_lead(rules, metadata or {}))

            custom_results = self.apply_custom_rules(rules, action_data)
            if custom_results:
                rule_results.extend(custom_results)

            # Final decision
            decision_data = self.decide(rule_results)
            decision = decision_data.get("decision")
            reason = decision_data.get("reason")

            # Audit log
            if self.action_repo:
                self.log_action(
                    workspace_id=workspace_id,
                    action_type=action_type,
                    intent=intent,
                    decision=decision,
                    reason=reason,
                    rule_results=rule_results,
                    metadata=metadata
                )

            response = {
                "decision": decision,
                "reason": reason,
                "rule_results": rule_results
            }

            self.logger.info(
                "MCP evaluation complete",
                extra={
                    "decision": decision,
                    "reason": reason
                }
            )

            return response

        except Exception as e:
            self.logger.error(
                "Error in evaluate_action",
                exc_info=True,
                extra={
                    "workspace_id": str(workspace_id),
                    "action_type": action_type
                }
            )

            return {
                "decision": "ESCALATE",
                "reason": "MCP evaluation failure",
                "rule_results": []
            }


   # RULE LOADING
    def load_rules(self, workspace_id):
        try:
            ws_id = str(workspace_id) if workspace_id else "default"

            self.logger.info(
                "Loading rules",
                extra={"workspace_id": ws_id}
            )

            # Check cache first
            if ws_id in self.rule_cache:
                self.logger.info(
                    "Rules loaded from cache",
                    extra={"workspace_id": ws_id}
                )
                return self.rule_cache[ws_id]

            # Fetch from repository if available
            db_rules = {}
            if self.rule_repo and workspace_id:
                try:
                    record = self.rule_repo.get_by_workspace_id(workspace_id)
                    if record and getattr(record, "rules", None):
                        db_rules = record.rules
                except Exception:
                    self.logger.warning(
                        "Failed to fetch rules from repo, using defaults",
                        extra={"workspace_id": ws_id}
                    )

            # Merge defaults with DB rules
            config = self.config_service.get_config(workspace_id)

            merged_rules = {
                "confidence_threshold": config.get("confidence_threshold"),
                "followup_limit": config.get("followup_limit"),
                "blocked_keywords": config.get("blocked_keywords"),
                "sensitive_categories": config.get("sensitive_categories"),
                "custom_rules": db_rules.get("custom_rules", {})
            }

            # Cache rules
            self.rule_cache[ws_id] = merged_rules

            self.logger.info(
                "Rules loaded successfully",
                extra={
                    "workspace_id": ws_id,
                    "has_custom_rules": bool(merged_rules.get("custom_rules"))
                }
            )

            return merged_rules

        except Exception as e:
            self.logger.error(
                "Error loading rules",
                exc_info=True,
                extra={"workspace_id": str(workspace_id) if workspace_id else None}
            )

            if self.config_service:
                return self.config_service.get_config(workspace_id)

            return {
                "confidence_threshold": 0.6,
                "followup_limit": 3,
                "blocked_keywords": [],
                "sensitive_categories": []
            }

    # CONFIDENCE RULE
    def check_confidence(self, rules, confidence):
        try:
            threshold = rules.get("confidence_threshold")
            conf = float(confidence) if confidence is not None else 0.0

            status = "PASS"
            outcome = "ALLOW"
            reason = "Confidence above threshold"

            if conf < threshold:
                status = "FAIL"
                outcome = "ESCALATE"
                reason = f"Low confidence ({conf}) below threshold ({threshold})"

            result = {
                "rule": "confidence",
                "status": status,
                "outcome": outcome,
                "reason": reason,
                "details": {
                    "confidence": conf,
                    "threshold": threshold
                }
            }

            self.logger.info(
                "Confidence rule evaluated",
                extra={
                    "confidence": conf,
                    "threshold": threshold,
                    "outcome": outcome
                }
            )

            return result

        except Exception as e:
            self.logger.error(
                "Error in confidence rule",
                exc_info=True,
                extra={"confidence": confidence}
            )

            return {
                "rule": "confidence",
                "status": "FAIL",
                "outcome": "ESCALATE",
                "reason": "Confidence rule error",
                "details": {}
            }

    # BLOCKED KEYWORDS RULE
    def check_blocked_keywords(self, rules, context, metadata):
        try:
            message = context.get("message", "").lower() if isinstance(context, dict) else ""
            response = metadata.get("response", "").lower() if isinstance(metadata, dict) else ""
            text = f"{message} {response}"
            
            blocked = rules.get("blocked_keywords") or []

            matched = []
            for kw in blocked:
                try:
                    if kw and kw.lower() in text:
                        matched.append(kw)
                except Exception:
                    continue

            if matched:
                result = {
                    "rule": "blocked_keywords",
                    "status": "FAIL",
                    "outcome": "ESCALATE",
                    "reason": f"Blocked keywords detected: {matched}",
                    "details": {
                        "matched_keywords": matched
                    }
                }
            else:
                result = {
                    "rule": "blocked_keywords",
                    "status": "PASS",
                    "outcome": "ALLOW",
                    "reason": "No blocked keywords found",
                    "details": {
                        "matched_keywords": []
                    }
                }

            self.logger.info(
                "Blocked keywords rule evaluated",
                extra={
                    "matched": matched,
                    "outcome": result["outcome"]
                }
            )

            return result

        except Exception as e:
            self.logger.error(
                "Error in blocked keywords rule",
                exc_info=True,
                extra={"intent": intent}
            )

            return {
                "rule": "blocked_keywords",
                "status": "FAIL",
                "outcome": "ESCALATE",
                "reason": "Blocked keywords rule error",
                "details": {}
            }

   
    # FOLLOW-UP LIMIT RULE
    def check_followup_limit(self, rules, context, metadata):
        try:
            meta = metadata or {}
            ctx = context or {}
            
            followup_count = int(meta.get("followup_count") or ctx.get("followup_count") or 0)
            limit = int(rules.get("followup_limit", 3))

            status = "PASS"
            outcome = "ALLOW"
            reason = "Within follow-up limit"

            if followup_count >= limit:
                status = "FAIL"
                outcome = "ESCALATE"
                reason = f"Follow-up limit exceeded ({followup_count} >= {limit})"

            result = {
                "rule": "followup_limit",
                "status": status,
                "outcome": outcome,
                "reason": reason,
                "details": {
                    "followup_count": followup_count,
                    "limit": limit
                }
            }

            self.logger.info(
                "Follow-up limit rule evaluated",
                extra={
                    "followup_count": followup_count,
                    "limit": limit,
                    "outcome": outcome
                }
            )

            return result

        except Exception as e:
            self.logger.error(
                "Error in follow-up limit rule",
                exc_info=True,
                extra={"metadata": metadata}
            )

            return {
                "rule": "followup_limit",
                "status": "FAIL",
                "outcome": "ESCALATE",
                "reason": "Follow-up limit rule error",
                "details": {}
            }

    # HIGH VALUE LEAD RULE
    def check_high_value_lead(self, rules, metadata):
        try:
            meta = metadata or {}

            # Extract value
            raw_value = (
                meta.get("lead_value")
                or meta.get("deal_value")
                or meta.get("amount")
                or 0
            )

            try:
                lead_value = float(raw_value)
            except Exception:
                lead_value = 0.0

            # Threshold 
            threshold = float(
                rules.get("high_value_threshold", 10000)
            )

            status = "PASS"
            outcome = "ALLOW"
            reason = "Lead value below threshold"

            if lead_value >= threshold:
                status = "FAIL"
                outcome = "ESCALATE"
                reason = f"High value lead detected ({lead_value} >= {threshold})"

            result = {
                "rule": "high_value_lead",
                "status": status,
                "outcome": outcome,
                "reason": reason,
                "details": {
                    "lead_value": lead_value,
                    "threshold": threshold
                }
            }

            self.logger.info(
                "High value lead rule evaluated",
                extra={
                    "lead_value": lead_value,
                    "threshold": threshold,
                    "outcome": outcome
                }
            )

            return result

        except Exception as e:
            self.logger.error(
                "Error in high value lead rule",
                exc_info=True,
                extra={"metadata": metadata}
            )

            return {
                "rule": "high_value_lead",
                "status": "FAIL",
                "outcome": "ESCALATE",
                "reason": "High value lead rule error",
                "details": {}
            }


    # SENSITIVE INTENT RULE
    def check_sensitive_intent(self, rules, intent):
        try:
            text = (intent or "").lower()

            categories = rules.get(
                "sensitive_categories",
                []
            ) or []

            # Default keyword map
            default_keywords = {
                "legal": ["legal", "lawyer", "court", "case", "notice"],
                "payment": ["payment", "refund", "charge", "billing", "transaction"],
                "complaint": ["complaint", "issue", "not working", "angry", "bad service"],
                "verification": ["verify", "verification", "document", "kyc", "id proof"]
            }

            custom_keywords = rules.get("sensitive_keywords", {}) or {}
            keyword_map = {**default_keywords, **custom_keywords}

            matched_categories = []
            matched_keywords = []

            for cat in categories:
                kws = keyword_map.get(cat, [])
                for kw in kws:
                    if kw and kw.lower() in text:
                        matched_categories.append(cat)
                        matched_keywords.append(kw)
                        break 

            if matched_categories:
                result = {
                    "rule": "sensitive_intent",
                    "status": "FAIL",
                    "outcome": "ESCALATE",
                    "reason": f"Sensitive intent detected: {matched_categories}",
                    "details": {
                        "categories": matched_categories,
                        "keywords": matched_keywords
                    }
                }
            else:
                result = {
                    "rule": "sensitive_intent",
                    "status": "PASS",
                    "outcome": "ALLOW",
                    "reason": "No sensitive intent detected",
                    "details": {
                        "categories": [],
                        "keywords": []
                    }
                }

            self.logger.info(
                "Sensitive intent rule evaluated",
                extra={
                    "categories": matched_categories,
                    "outcome": result["outcome"]
                }
            )

            return result

        except Exception as e:
            self.logger.error(
                "Error in sensitive intent rule",
                exc_info=True,
                extra={"intent": intent}
            )

            return {
                "rule": "sensitive_intent",
                "status": "FAIL",
                "outcome": "ESCALATE",
                "reason": "Sensitive intent rule error",
                "details": {}
            }

    # CUSTOM USER RULES ENGINE
    def apply_custom_rules(self, rules, action_data):
        try:
            self.logger.info(
                "Applying custom rules",
                extra={"action_type": action_data.get("action_type")}
            )

            custom_rules = rules.get("custom_rules", {}) or {}
            results = []

            intent = (action_data.get("intent") or "").lower()
            context = action_data.get("context", {})
            metadata = action_data.get("metadata", {}) or {}
            channel = (context.get("channel") or "").lower()

            for rule_name, rule in custom_rules.items():
                try:
                    condition = rule.get("condition", {})
                    action = rule.get("action", "ALLOW")
                    reason = rule.get("reason", "Custom rule triggered")

                    status = "PASS"
                    outcome = "ALLOW"

                    # Condition checks
                    matched = True

                    # Intent match
                    if "intent" in condition:
                        if condition["intent"].lower() not in intent:
                            matched = False

                    # Channel match
                    if "channel" in condition:
                        if condition["channel"].lower() != channel:
                            matched = False

                    # Time-based rule
                    if "time_range" in condition:
                        
                        now_hour = datetime.datetime.utcnow().hour
                        start = condition["time_range"].get("start", 0)
                        end = condition["time_range"].get("end", 23)
                        if not (start <= now_hour <= end):
                            matched = False

                    # Metadata checks
                    if "metadata" in condition:
                        for key, val in condition["metadata"].items():
                            if metadata.get(key) != val:
                                matched = False
                                break

                    if matched:
                        status = "FAIL"
                        outcome = action 
                        result = {
                            "rule": f"custom:{rule_name}",
                            "status": status,
                            "outcome": outcome,
                            "reason": reason,
                            "details": {
                                "condition": condition
                            }
                        }
                    else:
                        result = {
                            "rule": f"custom:{rule_name}",
                            "status": "PASS",
                            "outcome": "ALLOW",
                            "reason": "Condition not met",
                            "details": {}
                        }

                    results.append(result)

                except Exception as inner_e:
                    self.logger.error(
                        "Error evaluating custom rule",
                        exc_info=True,
                        extra={"rule": rule_name}
                    )
                    results.append({
                        "rule": f"custom:{rule_name}",
                        "status": "FAIL",
                        "outcome": "ESCALATE",
                        "reason": "Custom rule error",
                        "details": {}
                    })

            self.logger.info(
                "Custom rules applied",
                extra={"count": len(results)}
            )

            return results

        except Exception as e:
            self.logger.error(
                "Error in apply_custom_rules",
                exc_info=True,
                extra={"action_data": action_data}
            )

            return []

    # FINAL DECISION ENGINE
    def decide(self, rule_results):
        try:
            self.logger.info(
                "Computing final decision",
                extra={"rules_count": len(rule_results) if rule_results else 0}
            )

            if not rule_results:
                return {
                    "decision": "ALLOW",
                    "reason": "No rules applied"
                }

            final_decision = "ALLOW"
            reasons = []

            # Priority evaluation
            for rule in rule_results:
                outcome = rule.get("outcome", "ALLOW")
                reason = rule.get("reason", "")

                if outcome == "BLOCK":
                    final_decision = "BLOCK"
                    reasons.append(reason)
                    break  # highest priority

                elif outcome == "ESCALATE":
                    if final_decision != "BLOCK":
                        final_decision = "ESCALATE"
                    reasons.append(reason)

                else:
                    reasons.append(reason)

            # Build reason summary
            unique_reasons = list({r for r in reasons if r})
            reason_summary = " | ".join(unique_reasons) if unique_reasons else "No specific reason"

            result = {
                "decision": final_decision,
                "reason": reason_summary
            }

            self.logger.info(
                "Final decision computed",
                extra={
                    "decision": final_decision,
                    "reason": reason_summary
                }
            )

            return result

        except Exception as e:
            self.logger.error(
                "Error in decision engine",
                exc_info=True,
                extra={"rule_results": rule_results}
            )

            return {
                "decision": "ESCALATE",
                "reason": "Decision engine failure"
            }

 
   
    # mcpservice.py — replace log_action body:
    def log_action(self, workspace_id, action_type, intent,
                decision, reason, rule_results, metadata):
        if self.memory_service:
            return self.memory_service.log_ai_action(
                workspace_id=workspace_id, action_type=action_type,
                intent=intent, confidence=metadata.get("confidence") if metadata else None,
                decision=decision, reason=reason, metadata=metadata
            )
