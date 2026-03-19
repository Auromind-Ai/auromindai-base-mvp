import time
import threading
from collections import defaultdict

from app.services.agentic_rag.rag_service import AgenticRAG
from app.config.llm_config import GroqLLM


# 🔥 INIT
llm = GroqLLM()

rag = AgenticRAG(
    llm=llm,
    vector_store=None,
    embedding_generator=None
)


# ✅ BASE TESTS
test_cases = {
    "hi": "direct_answer",
    "45*3": "calculator",
    "What is refund policy?": "vector_db",
    "Who is Elon Musk?": "web_search",
    "latest email": "direct_storage",
    "Explain AI": "reasoning",
    "compare rag and agentic rag": "reasoning",
    "summarize AI text": "reasoning"
}


# 🔥 EXTRA EDGE TESTS
edge_cases = [
    "refund",
    "policy details",
    "rag",
    "email about AI",
    "latest update on AI",
    "Elon Musk email",
    "summarize refund policy",
    "analyze company growth"
]


# 📊 STATS
stats = {
    "total": 0,
    "pass": 0,
    "fail": 0,
    "errors": 0
}

tool_usage = defaultdict(int)


# 🧪 SINGLE TEST FUNCTION
def run_test(query, expected=None):
    try:
        start = time.time()

        tool = rag.decide_tool(query)

        latency = round((time.time() - start) * 1000, 2)

        tool_usage[tool] += 1
        stats["total"] += 1

        if expected:
            if tool == expected:
                stats["pass"] += 1
                status = "✅ PASS"
            else:
                stats["fail"] += 1
                status = "❌ FAIL"
        else:
            status = "⚠️ NO EXPECTATION"

        print(f"{query} → {tool} | {status} | {latency}ms")

    except Exception as e:
        stats["errors"] += 1
        print(f"{query} → 💥 ERROR: {e}")


# 🔥 BASIC TEST RUN
def run_basic_tests():
    print("\n===== BASIC TESTS =====\n")

    for q, expected in test_cases.items():
        run_test(q, expected)


# 🔥 EDGE TEST RUN
def run_edge_tests():
    print("\n===== EDGE TESTS =====\n")

    for q in edge_cases:
        run_test(q)


# 🔥 STRESS TEST (CONCURRENT USERS)
def run_stress_test(num_requests=20, concurrency=2):

    print(f"\n===== STRESS TEST ({num_requests} requests) =====\n")

    queries = list(test_cases.keys()) + edge_cases

    def worker():
        for _ in range(num_requests // concurrency):
            for q in queries:
                run_test(q)

    threads = []

    start_time = time.time()

    for _ in range(concurrency):
        t = threading.Thread(target=worker)
        t.start()
        threads.append(t)

    for t in threads:
        t.join()

    total_time = round(time.time() - start_time, 2)

    print(f"\n⏱️ Total Time: {total_time}s")


# 📊 FINAL REPORT
def print_report():
    print("\n===== FINAL REPORT =====\n")

    print(f"Total Requests: {stats['total']}")
    print(f"Passed: {stats['pass']}")
    print(f"Failed: {stats['fail']}")
    print(f"Errors: {stats['errors']}")

    accuracy = (stats["pass"] / stats["total"]) * 100 if stats["total"] else 0

    print(f"\n🎯 Accuracy: {round(accuracy, 2)}%")

    print("\n📊 Tool Usage:")
    for tool, count in tool_usage.items():
        print(f"{tool}: {count}")


# 🚀 RUN ALL
if __name__ == "__main__":
    run_basic_tests()
    run_edge_tests()
    run_stress_test(num_requests=50, concurrency=5)
    print_report()