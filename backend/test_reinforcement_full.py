# test_reinforcement_full.py
import pytest
from test_reinforcement import FakeDB, FakeFeedback, ReinforcementEngine

# ─── Fixtures ────────────────────────────────────────────
def make_engine(samples):
    objs = [FakeFeedback(s) for s in samples]
    return ReinforcementEngine(FakeDB(objs))

# ─── 1. learn_tool_selection_rules ───────────────────────

def test_tool_rules_basic():
    """Normal case — vector_db should have high success"""
    engine = make_engine([
        {"query": "company policy", "tool": "vector_db", "feedback": "up"},
        {"query": "internal docs",  "tool": "vector_db", "feedback": "up"},
        {"query": "latest news",    "tool": "vector_db", "feedback": "down"},
    ])
    rules = engine.learn_tool_selection_rules()
    vector_rule = next((r for r in rules if r["tool"] == "vector_db"), None)

    assert vector_rule is not None
    assert vector_rule["success_rate"] == pytest.approx(66.67, abs=0.1)
    assert "policy" in vector_rule["top_keywords"]
    assert "latest" not in vector_rule["top_keywords"]  # penalized

def test_tool_rules_empty_db():
    """Edge case — no data"""
    engine = make_engine([])
    rules = engine.learn_tool_selection_rules()
    assert rules == []

def test_tool_rules_all_positive():
    """All feedback positive"""
    engine = make_engine([
        {"query": "search web",  "tool": "web_search", "feedback": "up"},
        {"query": "latest news", "tool": "web_search", "feedback": "up"},
    ])
    rules = engine.learn_tool_selection_rules()
    web_rule = next((r for r in rules if r["tool"] == "web_search"), None)
    assert web_rule["success_rate"] == 100.0

def test_tool_rules_all_negative():
    """All feedback negative — success rate 0"""
    engine = make_engine([
        {"query": "explain AI", "tool": "reasoning", "feedback": "down"},
        {"query": "what is ML", "tool": "reasoning", "feedback": "down"},
    ])
    rules = engine.learn_tool_selection_rules()
    r = next((r for r in rules if r["tool"] == "reasoning"), None)
    assert r["success_rate"] == 0.0
    assert r["top_keywords"] == []  # no positive keywords

def test_unknown_tool_filtered():
    """unknown tool should be skipped"""
    engine = make_engine([
        {"query": "test query", "tool": "unknown", "feedback": "up"},
    ])
    rules = engine.learn_tool_selection_rules()
    tools = [r["tool"] for r in rules]
    assert "unknown" not in tools

def test_keyword_penalty():
    """Negative feedback should penalize keywords"""
    engine = make_engine([
        {"query": "latest news search", "tool": "web_search", "feedback": "up"},
        {"query": "latest news search", "tool": "web_search", "feedback": "up"},
        {"query": "latest news",        "tool": "web_search", "feedback": "down"},
        {"query": "latest news",        "tool": "web_search", "feedback": "down"},
        {"query": "latest news",        "tool": "web_search", "feedback": "down"},
    ])
    rules = engine.learn_tool_selection_rules()
    web_rule = next((r for r in rules if r["tool"] == "web_search"), None)
    # "latest" — 2 positive, 3×2=6 penalty = -4 → should NOT be in keywords
    assert "latest" not in web_rule["top_keywords"]

# ─── 2. adjust_pipeline ──────────────────────────────────

def test_adjust_pipeline_no_change():
    """No similar failures — tool should NOT change"""
    engine = make_engine([
        {"query": "completely different topic", "tool": "calculator", "feedback": "down"},
    ])
    result = engine.adjust_pipeline(
        query="company policy document",
        rewritten_query="company policy",
        tool="vector_db"
    )
    assert result["tool"] == "vector_db"
    assert result["adjusted"] == False

def test_adjust_pipeline_switches_tool():
    """Similar failures exist + success with another tool"""
    samples = (
        # similar query failed with vector_db (3 times)
        [{"query": "latest AI news", "tool": "vector_db", "feedback": "down"}] * 3 +
        # same query succeeded with web_search (2 times)
        [{"query": "latest AI news", "tool": "web_search", "feedback": "up"}] * 2
    )
    engine = make_engine(samples)
    result = engine.adjust_pipeline(
        query="latest AI news today",
        rewritten_query="latest AI news",
        tool="vector_db"
    )
    assert result["tool"] == "web_search"

def test_adjust_pipeline_no_evidence():
    """Failures exist but no success with alternative"""
    samples = [
        {"query": "latest AI news", "tool": "vector_db",  "feedback": "down"},
        {"query": "latest AI news", "tool": "vector_db",  "feedback": "down"},
        {"query": "latest AI news", "tool": "web_search", "feedback": "down"},
    ]
    engine = make_engine(samples)
    result = engine.adjust_pipeline(
        query="latest AI news",
        rewritten_query="latest AI news",
        tool="vector_db"
    )
    # best_score = 0 — no positive evidence → keep original
    assert result["tool"] == "vector_db"

# ─── 3. build_reinforcement_memory ───────────────────────

def test_memory_good_queries():
    engine = make_engine([
        {"query": "what is python", "tool": "reasoning", "feedback": "up"},
        {"query": "explain ML",     "tool": "reasoning", "feedback": "up"},
        {"query": "latest news",    "tool": "web_search","feedback": "down"},
    ])
    memory = engine.build_reinforcement_memory()
    assert "what is python" in memory["good_queries"]
    assert "explain ML"     in memory["good_queries"]
    assert "latest news"    in memory["bad_queries"]

def test_memory_tool_insights():
    engine = make_engine([
        {"query": "q1", "tool": "vector_db", "feedback": "up"},
        {"query": "q2", "tool": "vector_db", "feedback": "up"},
        {"query": "q3", "tool": "vector_db", "feedback": "down"},
    ])
    memory = engine.build_reinforcement_memory()
    assert memory["tool_insights"]["vector_db"]["positive"] == 2
    assert memory["tool_insights"]["vector_db"]["negative"] == 1

def test_memory_empty():
    engine = make_engine([])
    memory = engine.build_reinforcement_memory()
    assert memory["good_queries"] == []
    assert memory["bad_queries"]  == []
    assert memory["tool_insights"] == {}

# ─── 4. evaluate_answer_quality ──────────────────────────

def test_quality_good_answer():
    engine = make_engine([])
    result = engine.evaluate_answer_quality(
        "This is a comprehensive answer about machine learning concepts.", "up"
    )
    assert result["is_valid"] == True
    assert result["quality_score"] >= 70

def test_quality_too_short():
    engine = make_engine([])
    result = engine.evaluate_answer_quality("No.", "up")
    assert "too_short" in result["issues"]

def test_quality_fallback_phrase():
    engine = make_engine([])
    result = engine.evaluate_answer_quality(
        "Information not available in the database.", "up"
    )
    assert "fallback_response" in result["issues"]

def test_quality_empty_answer():
    engine = make_engine([])
    result = engine.evaluate_answer_quality("", "up")
    assert result["is_valid"] == False
    assert result["quality_score"] == 0

def test_quality_negative_feedback():
    engine = make_engine([])
    result = engine.evaluate_answer_quality(
        "This is a good detailed answer with proper explanation.", "down"
    )
    assert result["quality_score"] < 50

# ─── 5. extract_positive_patterns ────────────────────────

def test_positive_patterns_top_tools():
    engine = make_engine([
        {"query": "q1", "tool": "vector_db",  "feedback": "up"},
        {"query": "q2", "tool": "vector_db",  "feedback": "up"},
        {"query": "q3", "tool": "web_search", "feedback": "up"},
    ])
    patterns = engine.extract_positive_patterns()
    tools = [t[0] for t in patterns["top_tools"]]
    assert tools[0] == "vector_db"  # most used

def test_positive_patterns_empty():
    engine = make_engine([
        {"query": "q1", "tool": "vector_db", "feedback": "down"},
    ])
    patterns = engine.extract_positive_patterns()
    assert patterns["total_samples"] == 0

# ─── 6. Full learning cycle ──────────────────────────────

def test_run_learning_cycle_keys():
    """Learning cycle should return all expected keys"""
    engine = make_engine([
        {"query": "company policy", "tool": "vector_db",  "feedback": "up"},
        {"query": "latest news",    "tool": "web_search", "feedback": "up"},
        {"query": "calculate 2+2",  "tool": "calculator", "feedback": "up"},
    ])
    result = engine.run_learning_cycle()
    assert "tool_rules"         in result
    assert "rewrite_rules"      in result
    assert "memory"             in result
    assert "positive_patterns"  in result
    assert "failure_patterns"   in result

def test_run_learning_cycle_empty():
    """Empty DB — should not crash"""
    engine = make_engine([])
    result = engine.run_learning_cycle()
    assert result["tool_rules"] == []