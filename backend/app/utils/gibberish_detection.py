import re

# Dynamically construct the QWERTY keyboard adjacency graph and coordinate maps
QWERTY_ROWS = [
    "qwertyuiop",
    "asdfghjkl",
    "zxcvbnm"
]

ADJACENT_KEYS = {}
KEY_COORDS = {}
for row_idx, row in enumerate(QWERTY_ROWS):
    for col_idx, char in enumerate(row):
        KEY_COORDS[char] = (row_idx, col_idx)
        neighbors = set()
        # Horizontal neighbors (same row)
        if col_idx > 0:
            neighbors.add(row[col_idx - 1])
        if col_idx < len(row) - 1:
            neighbors.add(row[col_idx + 1])
            
        # Vertical and diagonal neighbors (from adjacent rows)
        for r_diff in [-1, 1]:
            target_row_idx = row_idx + r_diff
            if 0 <= target_row_idx < len(QWERTY_ROWS):
                target_row = QWERTY_ROWS[target_row_idx]
                for c_diff in [-1, 0, 1]:
                    target_col_idx = col_idx + c_diff
                    if 0 <= target_col_idx < len(target_row):
                        neighbors.add(target_row[target_col_idx])
                        
        ADJACENT_KEYS[char] = neighbors

def is_gibberish_or_unwanted(text: str) -> dict:
   
    text = text.strip()
    if not text:
        return {
            "is_unwanted": True,
            "reason": "empty_input",
            "score": 1.0
        }

    # Normalize text by removing spaces and punctuation to analyze alphabetical content
    cleaned = re.sub(r'[^a-zA-Z]', '', text).lower()
    if not cleaned:
        # If it is only numbers/special characters/punctuation (e.g., "123123213" or "!@#$%"), it is unwanted
        if re.match(r'^[0-9\s\W_]+$', text):
            return {
                "is_unwanted": True,
                "reason": "numeric_or_symbols",
                "score": 1.0
            }
        return {
            "is_unwanted": False,
            "reason": None,
            "score": 0.0
        }

    # Check for long runs of consecutive consonants
    consec_consonants = 0
    max_consec = 0
    vowels = set("aeiouy")
    for char in cleaned:
        if char not in vowels:
            consec_consonants += 1
            if consec_consonants > max_consec:
                max_consec = consec_consonants
        else:
            consec_consonants = 0

    if max_consec >= 5:
        return {
            "is_unwanted": True,
            "reason": "consonant_cluster",
            "score": min(1.0, max_consec / 8.0)
        }

    # Check for extremely low vowel ratio in longer words
    vowel_count = sum(1 for char in cleaned if char in vowels)
    vowel_ratio = vowel_count / len(cleaned)
    if len(cleaned) >= 5 and vowel_ratio < 0.15:
        return {
            "is_unwanted": True,
            "reason": "low_vowel_ratio",
            "score": round(1.0 - vowel_ratio, 3)
        }

    # Check for repeated characters (e.g., "aaaaa" or "helloooooo")
    repeated_match = re.search(r'(.)\1{4,}', text)
    if repeated_match:
        return {
            "is_unwanted": True,
            "reason": "repeated_characters",
            "score": 1.0
        }

    # Check for repeating single letter mashes (e.g., "aaaaa")
    if len(cleaned) >= 4 and len(set(cleaned)) == 1:
        return {
            "is_unwanted": True,
            "reason": "repeated_characters",
            "score": 1.0
        }

    # Dynamic keyboard slide detection with column direction reversal heuristic
    if len(cleaned) >= 6:
        # A true slide has high key adjacency
        adjacent_pairs = 0
        for i in range(len(cleaned) - 1):
            c1 = cleaned[i]
            c2 = cleaned[i+1]
            if c1 == c2:
                adjacent_pairs += 1
            elif c1 in ADJACENT_KEYS and c2 in ADJACENT_KEYS[c1]:
                adjacent_pairs += 1
        
        ratio = adjacent_pairs / (len(cleaned) - 1)
        if ratio >= 0.88:
            # Map column indices of the keys
            cols = [KEY_COORDS[c][1] for c in cleaned if c in KEY_COORDS]
            if len(cols) >= 3:
                diffs = [cols[i+1] - cols[i] for i in range(len(cols)-1)]
                # Filter out stationary keys to analyze movement directions
                movements = [d for d in diffs if d != 0]
                if len(movements) >= 2:
                    signs = [1 if m > 0 else -1 for m in movements]
                    # Count column direction reversals (left-to-right <=> right-to-left)
                    reversals = sum(1 for i in range(len(signs)-1) if signs[i] != signs[i+1])
                    # If the column direction reverses 2 or more times, it is a normal alternating English word, not a slide
                    if reversals >= 2:
                        return {
                            "is_unwanted": False,
                            "reason": None,
                            "score": 0.0
                        }
            
            return {
                "is_unwanted": True,
                "reason": "keyboard_slide",
                "score": round(ratio, 3)
            }

    return {
        "is_unwanted": False,
        "reason": None,
        "score": 0.0
    }
