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

    # Extract words from text
    raw_words = text.split()
    clean_words = [re.sub(r'[^a-zA-Z]', '', w).lower() for w in raw_words]
    clean_words = [w for w in clean_words if w]

    if not clean_words:
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

    # Check for repeated characters (e.g., "aaaaa" or "helloooooo" or "......")
    repeated_match = re.search(r'(.)\1{4,}', text)
    if repeated_match:
        return {
            "is_unwanted": True,
            "reason": "repeated_characters",
            "score": 1.0
        }

    vowels = set("aeiouy")

    # Multi-word sentence protection:
    # If the user typed a multi-word phrase with at least 2 words, check if the sentence contains recognizable structure.
    if len(clean_words) >= 2:
        valid_words = 0
        for w in clean_words:
            # Words with vowels, or short common acronyms (<= 5 chars like tnpl, ipl, api, sql, bcci, jwt, etc.)
            has_vowel = any(c in vowels for c in w)
            is_short_acronym = len(w) <= 5
            if has_vowel or is_short_acronym:
                valid_words += 1
        
        # If the majority of words are valid words or acronyms, this is a legitimate query
        if valid_words >= max(1, len(clean_words) // 2):
            return {
                "is_unwanted": False,
                "reason": None,
                "score": 0.0
            }

    # Single-word or non-standard token checks
    for w in clean_words:
        # 1. Repeating single letter mashes (e.g., "aaaaa")
        if len(w) >= 4 and len(set(w)) == 1:
            return {
                "is_unwanted": True,
                "reason": "repeated_characters",
                "score": 1.0
            }

        # 2. Check for long runs of consecutive consonants within a single token (>= 6 consonants and no vowels)
        consec_consonants = 0
        max_consec = 0
        for char in w:
            if char not in vowels:
                consec_consonants += 1
                if consec_consonants > max_consec:
                    max_consec = consec_consonants
            else:
                consec_consonants = 0

        # Only flag if a single word has 6+ consecutive consonants or >= 6 chars with 0 vowels
        vowel_count = sum(1 for c in w if c in vowels)
        if max_consec >= 6 and (vowel_count == 0 or len(w) >= 7):
            return {
                "is_unwanted": True,
                "reason": "consonant_cluster",
                "score": min(1.0, max_consec / 8.0)
            }

        # 3. Check for extremely low vowel ratio in longer non-acronym words (length >= 7 and vowel ratio < 0.12)
        vowel_ratio = vowel_count / len(w)
        if len(w) >= 7 and vowel_ratio < 0.12:
            return {
                "is_unwanted": True,
                "reason": "low_vowel_ratio",
                "score": round(1.0 - vowel_ratio, 3)
            }

        # 4. Keyboard slide detection on long single tokens
        if len(w) >= 6:
            adjacent_pairs = 0
            for i in range(len(w) - 1):
                c1 = w[i]
                c2 = w[i+1]
                if c1 == c2:
                    adjacent_pairs += 1
                elif c1 in ADJACENT_KEYS and c2 in ADJACENT_KEYS[c1]:
                    adjacent_pairs += 1
            
            ratio = adjacent_pairs / (len(w) - 1)
            if ratio >= 0.88:
                cols = [KEY_COORDS[c][1] for c in w if c in KEY_COORDS]
                if len(cols) >= 3:
                    diffs = [cols[i+1] - cols[i] for i in range(len(cols)-1)]
                    movements = [d for d in diffs if d != 0]
                    if len(movements) >= 2:
                        signs = [1 if m > 0 else -1 for m in movements]
                        reversals = sum(1 for i in range(len(signs)-1) if signs[i] != signs[i+1])
                        if reversals >= 2:
                            continue
                
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
