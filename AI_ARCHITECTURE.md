# AI Grounding & Hallucination Prevention

I have moved your AI from "Conversational" to **"Literal & Proof-Based."** It will now prioritize your **Original Content** above all else.

---

## 🛡️ Layer 1: The "Grader" Agent
Before generating an answer, a separate AI model performs a "Relevancy Check":
*   **Action**: It reads the retrieved document chunks and the question.
*   **Result**: If the documents don't have the answer, it blocks the AI from speaking. This prevents "confident lies."

## 🛡️ Layer 2: Literal Prompting
I have updated the inner "Brain" instructions with these rules:
1.  **Strict Isolation**: The AI is forbidden from using outside knowledge.
2.  **Original Content**: It is instructed to use direct excerpts and specific facts from your documents.
3.  **Honest Humility**: If the data is missing, the AI says: *"I don't know."*

## 🛡️ Layer 3: Mathematical Accuracy (Temperature 0.1)
I have lowered the "Temperature" of the AI models from **0.5 to 0.1**.
*   **Temperature 0.1 (Current)**: The AI is very stable, predictable, and literal. It chooses the most fact-aligned words.
*   **Temperature 0.9**: High "creativity," but high risk of making things up. 

---

## Summary
Your "AI Brain" is now a cold, hard fact-checker. It will give you the **original content** you uploaded, not a guess. ✅
