import random
from app.services.agentic_rag.reinforcement import ReinforcementEngine

# =========================================================
# 🔥 SAMPLE DATA (100 DATASET EXACT)
# =========================================================

samples = [

    # VECTOR DB (GOOD)
    {"query": "company policy document", "tool": "vector_db", "feedback": "up"},
    {"query": "internal HR guidelines", "tool": "vector_db", "feedback": "up"},
    {"query": "employee leave policy", "tool": "vector_db", "feedback": "up"},
    {"query": "project documentation details", "tool": "vector_db", "feedback": "up"},
    {"query": "internal knowledge base info", "tool": "vector_db", "feedback": "up"},

    # VECTOR DB (BAD)
    {"query": "latest AI news", "tool": "vector_db", "feedback": "down"},
    {"query": "current stock market news", "tool": "vector_db", "feedback": "down"},

    # WEB SEARCH (GOOD)
    {"query": "latest AI news", "tool": "web_search", "feedback": "up"},
    {"query": "latest tech updates", "tool": "web_search", "feedback": "up"},
    {"query": "news about India economy", "tool": "web_search", "feedback": "up"},
    {"query": "current stock market news", "tool": "web_search", "feedback": "up"},
    {"query": "latest sports news", "tool": "web_search", "feedback": "up"},

    # WEB SEARCH (BAD)
    {"query": "company policy details", "tool": "web_search", "feedback": "down"},
    {"query": "internal database query", "tool": "web_search", "feedback": "down"},

    # CALCULATOR (GOOD)
    {"query": "calculate 2+2", "tool": "calculator", "feedback": "up"},
    {"query": "10 * 5", "tool": "calculator", "feedback": "up"},
    {"query": "100 / 4", "tool": "calculator", "feedback": "up"},
    {"query": "square root of 16", "tool": "calculator", "feedback": "up"},

    # CALCULATOR (BAD)
    {"query": "calculate meaning of AI", "tool": "calculator", "feedback": "down"},

    # REASONING (GOOD)
    {"query": "explain machine learning", "tool": "reasoning", "feedback": "up"},
    {"query": "what is python", "tool": "reasoning", "feedback": "up"},
    {"query": "who is Elon Musk", "tool": "reasoning", "feedback": "up"},

    # REASONING (BAD)
    {"query": "latest AI news", "tool": "reasoning", "feedback": "down"},
    {"query": "calculate 5+5", "tool": "reasoning", "feedback": "down"},
    {"query": "stock price today", "tool": "reasoning", "feedback": "down"},

    # DIRECT ANSWER (GOOD)
    {"query": "what is API", "tool": "direct_answer", "feedback": "up"},
    {"query": "define AI", "tool": "direct_answer", "feedback": "up"},

    # DIRECT ANSWER (BAD)
    {"query": "latest AI news", "tool": "direct_answer", "feedback": "down"},
]


def generate_dataset():
    extended = []

    # 20 samples × 5 = 100 dataset
    for i in range(5):
        for s in samples:
            new = s.copy()
            new["query"] = f"{s['query']} {i}"
            extended.append(new)

    return extended

#  FAKE DB

class FakeDB:
    def __init__(self, data):
        self.data = data

    def query(self, model):
        return self

    def filter(self, *args, **kwargs):
        return self

    def order_by(self, *args, **kwargs):
        return self  # ignore sorting

    def limit(self, n):
        self.data = self.data[:n]
        return self

    def all(self):
        return self.data

    def count(self):
        return len(self.data)


# FAKE FEEDBACK OBJECT


class FakeFeedback:
    def __init__(self, d):
        self.query = d["query"]
        self.rewritten_query = d["query"]
        self.selected_tool = d["tool"]
        self.answer = "test answer"
        self.feedback = d["feedback"]



# PREPARE DATA

raw_data = generate_dataset()
fake_objects = [FakeFeedback(d) for d in raw_data]

print(f"📊 Dataset size: {len(fake_objects)}")  # should be 100

db = FakeDB(fake_objects)
engine = ReinforcementEngine(db)

# RUN LEARNING


def run_learning():
    print("\n🧠 Running learning...\n")

    result = engine.run_learning_cycle()

    print("\n📊 Learning Output:")
    for rule in result.get("tool_rules", []):
        print(f"Tool: {rule['tool']}")
        print(f"Success Rate: {rule.get('success_rate')}")
        print(f"Top Keywords: {rule.get('top_keywords')}")
        print("-" * 40)

    return result


# =========================================================
# 🚀 TEST ADAPTATION
# =========================================================

def test_adaptation():
    print("\n🚀 Testing adaptation...\n")

    query = "latest AI news"

    learning_data = engine.run_learning_cycle()

    tool = "reasoning"  # default wrong tool

    query_words = query.lower().split()

    for rule in learning_data.get("tool_rules", []):

        success = rule.get("success_rate", 0)

        # skip weak rules
        if success < 60:
            continue

        keywords = rule.get("top_keywords", [])

        print(f"🔍 Checking Tool: {rule['tool']}")
        print(f"Keywords: {keywords}")

        if any(kw in query_words for kw in keywords):
            print("🔥 Keyword match →", rule["tool"])
            tool = rule["tool"]
            break

    #PIPELINE ADJUST
    adjusted = engine.adjust_pipeline(
        query=query,
        tool=tool,
        rewritten_query=query
    )

    print("\n🔁 Before:", "reasoning")
    print("🔥 After:", adjusted["tool"])


if __name__ == "__main__":
    run_learning()
    test_adaptation()