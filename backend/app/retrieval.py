
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

def retrieve_runbooks(query, runbooks):
    corpus = [rb['content'] for rb in runbooks]
    vectorizer = TfidfVectorizer()
    X = vectorizer.fit_transform(corpus + [query])
    scores = cosine_similarity(X[-1], X[:-1])[0]
    ranked = sorted(zip(runbooks, scores), key=lambda x: x[1], reverse=True)
    return ranked[:3]
