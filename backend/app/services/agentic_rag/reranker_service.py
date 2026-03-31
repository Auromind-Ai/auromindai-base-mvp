from sentence_transformers import CrossEncoder

class RerankerService:
    _model = None 

    def __init__(self):
        if RerankerService._model is None:
            print("Loading reranker model (only once)...")
            RerankerService._model = CrossEncoder("BAAI/bge-reranker-large")

        self.model = RerankerService._model

    def predict(self, pairs):
        return self.model.predict(pairs)