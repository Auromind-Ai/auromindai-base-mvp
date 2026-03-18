from sentence_transformers import CrossEncoder

class RerankerService:

    def __init__(self):

        self.model = CrossEncoder("BAAI/bge-reranker-large")

    def predict(self, pairs):

        return self.model.predict(pairs)