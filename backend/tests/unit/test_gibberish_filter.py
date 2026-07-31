from app.utils.gibberish_detection import is_gibberish_or_unwanted

def test_gibberish_filter():
    test_cases = {
        # Gibberish/unwanted inputs -> Expected: True
        "hrtjtykyu": True,
        "asdfghjkl": True,
        "qwertyuiop": True,
        "gjhgjhg": True,
        "123123213": True,
        "!!!!!!!": True,
        "aaaaaaa": True,
        "zxcvbnm": True,
        "asdfghgfds": True,  # Mixed order slide
        "lkjhgfdsa": True,   # Reverse slide
        "qaswedfrtgyh": True, # Diagonal slide
        
        # Real/wanted inputs -> Expected: False
        "Hi": False,
        "hello": False,
        "Dress": False,
        "What is the price of this dress?": False,
        "Can you help me?": False,
        "why": False,
        "Okay": False,
        "dressed": False,   # High adjacency but valid English word
        "sweater": False,   # High adjacency but valid English word
    }

    passed = 0
    failed = 0
    for query, expected in test_cases.items():
        result = is_gibberish_or_unwanted(query)
        is_unwanted = result["is_unwanted"]
        if is_unwanted == expected:
            print(f"✓ PASSED: '{query}' -> is_unwanted={is_unwanted} | reason={result['reason']} | score={result['score']}")
            passed += 1
        else:
            print(f"✗ FAILED: '{query}' -> is_unwanted={is_unwanted} (expected={expected}) | result={result}")
            failed += 1

    print(f"\nSummary: {passed} passed, {failed} failed.")
    assert failed == 0, "Some test cases failed!"

if __name__ == "__main__":
    test_gibberish_filter()
