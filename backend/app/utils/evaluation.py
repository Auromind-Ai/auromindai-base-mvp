import re

def token_match_percentage(answer, context):

    answer_tokens = set(re.findall(r'\w+', answer.lower()))
    context_tokens = set(re.findall(r'\w+', context.lower()))

    if not answer_tokens:
        return 0.0

    matched_tokens = answer_tokens.intersection(context_tokens)

    percentage = (len(matched_tokens) / len(answer_tokens)) * 100

    return round(percentage, 2)