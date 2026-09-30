import streamlit as st
import pymupdf  
import numpy as np
import faiss
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
import google.generativeai as genai
from PIL import Image
import pytesseract

# Uncomment and set this path if Tesseract is not in your Windows PATH automatically:
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'

GEMINI_API_KEY = "AQ.Ab8RN6L_6OrWZgSr3xv9JPNk0lpHSNTfu5a7WbdTGCCdpwzerg"

# List of conversational filler words to ignore during lexical keyword scoring
CONVERSATIONAL_STOPWORDS = {
    "explain", "tell", "what", "is", "are", "me", "in", "a", "an", "the", 
    "very", "basic", "layman", "language", "with", "real", "life", "example", 
    "examples", "simple", "terms", "give", "how", "does", "work", "about"
}

@st.cache_resource
def load_embedding_model():
    return SentenceTransformer('all-MiniLM-L6-v2')

class HybridRAGEngine:
    def __init__(self, embedding_model):
        self.embedding_model = embedding_model
        self.chunks = []
        self.bm25 = None
        self.faiss_index = None

    def index_documents(self, chunks):
        self.chunks = chunks
        
        tokenized_corpus = [chunk['text'].lower().split() for chunk in chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)
        
        texts = [chunk['text'] for chunk in chunks]
        embeddings = self.embedding_model.encode(texts, convert_to_numpy=True)
        dimension = embeddings.shape[1]
        self.faiss_index = faiss.IndexFlatL2(dimension)
        self.faiss_index.add(embeddings)

    def retrieve(self, query, top_k=5):
        # 1. Clean query for BM25 keyword matching
        raw_tokens = query.lower().split()
        filtered_tokens = [w for w in raw_tokens if w not in CONVERSATIONAL_STOPWORDS]
        bm25_query = filtered_tokens if filtered_tokens else raw_tokens
        
        bm25_scores = self.bm25.get_scores(bm25_query)
        top_bm25_indices = np.argsort(bm25_scores)[::-1][:top_k]
        
        # 2. Semantic search uses the full query to capture intent
        query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)
        _, top_faiss_indices = self.faiss_index.search(query_embedding, top_k)
        
        combined_indices = set(top_bm25_indices).union(set(top_faiss_indices[0]))
        return [self.chunks[i] for i in combined_indices]

def process_files(uploaded_files):
    chunks = []
    max_chars, overlap = 1000, 200
    global_chunk_id = 1
    
    for uploaded_file in uploaded_files:
        pages = []
        if uploaded_file.name.lower().endswith('.pdf'):
            doc = pymupdf.open(stream=uploaded_file.read(), filetype="pdf")
            pages = [doc[page_num].get_text("text").strip() for page_num in range(len(doc)) if doc[page_num].get_text("text").strip()]
        elif uploaded_file.name.lower().endswith(('.png', '.jpg', '.jpeg')):
            image = Image.open(uploaded_file)
            extracted_text = pytesseract.image_to_string(image).strip()
            if extracted_text:
                pages = [extracted_text]

        for page in pages:
            start = 0
            while start < len(page):
                end = min(start + max_chars, len(page))
                chunks.append({
                    "id": global_chunk_id,
                    "source": uploaded_file.name,
                    "text": page[start:end]
                })
                global_chunk_id += 1
                start += max_chars - overlap
                
    return chunks

def generate_answer(query, context):
    genai.configure(api_key=GEMINI_API_KEY)
    
    # Updated to gemini-3.5-flash as it is the stable model currently available
    model = genai.GenerativeModel('gemini-3.5-flash') 
    
    prompt = f"""You are an intelligent data assistant. Use the provided Context as your primary factual source to answer the user's Question.

RULES:
1. You may simplify explanations, translate into layman's terms, format the response cleanly, and create illustrative real-life examples or analogies, provided the underlying facts and concepts come directly from the Context.
2. If the core topic or subject asked by the user is completely missing or unmentioned in the Context, respond strictly with: "The information is not provided."
3. Do not introduce outside facts, dates, or concepts that are unrelated to what is discussed in the Context.

Context:
{context}

Question: {query}
Answer:"""
    
    response = model.generate_content(prompt)
    return response.text.strip()

st.set_page_config(page_title="Context Management Engine", layout="wide")
st.title("Context Management Engine")
st.markdown("Capstone Prototype: Hybrid Retrieval (BM25 + FAISS) with Gemini")

if "engine" not in st.session_state:
    st.session_state.engine = HybridRAGEngine(load_embedding_model())
    st.session_state.is_indexed = False
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

with st.sidebar:
    st.header("📄 Document Upload")
    uploaded_files = st.file_uploader("Upload PDFs or Images (Max 5)", type=["pdf", "png", "jpg", "jpeg"], accept_multiple_files=True)
    
    if len(uploaded_files) > 5:
        st.warning("You can only upload a maximum of 5 files. Only the first 5 will be processed.")
        uploaded_files = uploaded_files[:5]
        
    if uploaded_files and st.button("Process Documents"):
        with st.spinner("Extracting, Chunking, and Indexing..."):
            chunks = process_files(uploaded_files)
            
            if not chunks:
                st.error("Error: Could not extract any text. Ensure the files contain readable digital text.")
            else:
                st.session_state.engine.index_documents(chunks)
                st.session_state.is_indexed = True
                st.success(f"Indexed {len(chunks)} total chunks across {len(uploaded_files)} files!")

if not st.session_state.is_indexed:
    st.info("👈 Please upload files and index them to begin.")
else:
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg["role"] == "assistant" and "chunks" in msg:
                with st.expander("View Retrieved Context"):
                    for chunk in msg["chunks"]:
                        st.markdown(f"**Chunk {chunk['id']} (Source: {chunk['source']}):**\n```\n{chunk['text']}\n```")

    query = st.chat_input("Ask a question about the files...")
    
    if query:
        st.session_state.chat_history.append({"role": "user", "content": query})
        with st.chat_message("user"):
            st.markdown(query)
        
        with st.chat_message("assistant"):
            with st.spinner("Retrieving context & generating answer..."):
                relevant_chunks = st.session_state.engine.retrieve(query, top_k=5)
                combined_context = "\n\n---\n\n".join([c['text'] for c in relevant_chunks])
                
                try:
                    answer = generate_answer(query, combined_context)
                    st.markdown(answer)
                    
                    st.session_state.chat_history.append({
                        "role": "assistant", 
                        "content": answer,
                        "chunks": relevant_chunks
                    })
                    
                    with st.expander("View Retrieved Context"):
                        for chunk in relevant_chunks:
                            st.markdown(f"**Chunk {chunk['id']} (Source: {chunk['source']}):**\n```\n{chunk['text']}\n```")
                            
                except Exception as e:
                    st.error(f"API Error: {str(e)}")