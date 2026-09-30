import streamlit as st
import fitz  # PyMuPDF
import numpy as np
import faiss
from rank_bm25 import BM25Okapi
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

# 1. ADD YOUR API KEY HERE
GEMINI_API_KEY = "AQ.Ab8RN6L_6OrWZgSr3xv9JPNk0lpHSNTfu5a7WbdTGCCdpwzerg"

# ==========================================
# 1. Core Engine Classes
# ==========================================
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
        
        tokenized_corpus = [chunk.lower().split() for chunk in chunks]
        self.bm25 = BM25Okapi(tokenized_corpus)
        
        embeddings = self.embedding_model.encode(chunks, convert_to_numpy=True)
        dimension = embeddings.shape[1]
        self.faiss_index = faiss.IndexFlatL2(dimension)
        self.faiss_index.add(embeddings)

    def retrieve(self, query, top_k=3):
        tokenized_query = query.lower().split()
        bm25_scores = self.bm25.get_scores(tokenized_query)
        top_bm25_indices = np.argsort(bm25_scores)[::-1][:top_k]
        
        query_embedding = self.embedding_model.encode([query], convert_to_numpy=True)
        _, top_faiss_indices = self.faiss_index.search(query_embedding, top_k)
        
        combined_indices = set(top_bm25_indices).union(set(top_faiss_indices[0]))
        return [self.chunks[i] for i in combined_indices]

# ==========================================
# 2. Helper Functions
# ==========================================
def process_pdf(uploaded_file):
    doc = fitz.open(stream=uploaded_file.read(), filetype="pdf")
    pages = [doc[page_num].get_text("text").strip() for page_num in range(len(doc)) if doc[page_num].get_text("text").strip()]
    
    chunks = []
    max_chars, overlap = 1000, 200
    for page in pages:
        start = 0
        while start < len(page):
            end = min(start + max_chars, len(page))
            chunks.append(page[start:end])
            start += max_chars - overlap
    return chunks

def generate_answer(query, context):
    # 2. KEY IS APPLIED HERE IN THE BACKGROUND
    genai.configure(api_key=GEMINI_API_KEY)
    model = genai.GenerativeModel('gemini-2.5-Flash') 
    
    prompt = f"""You are an intelligent data assistant. You must answer the user's question STRICTLY based on the provided Context.
    
CRITICAL INSTRUCTION: If the answer cannot be found in the Context, or if the question is completely unrelated to the Context, you MUST output exactly and only: "The information is not provided." Do not try to guess, deduce, or use outside knowledge.

Context:
{context}

Question: {query}
Answer:"""
    
    response = model.generate_content(prompt)
    return response.text.strip()

# ==========================================
# 3. Streamlit User Interface
# ==========================================
st.set_page_config(page_title="Context Management Engine", layout="wide")
st.title("Context Management Engine")
st.markdown("Capstone Prototype: Hybrid Retrieval (BM25 + FAISS) with Gemini 3.6 Flash")

if "engine" not in st.session_state:
    st.session_state.engine = HybridRAGEngine(load_embedding_model())
    st.session_state.is_indexed = False
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []

with st.sidebar:
    # 3. REMOVED API KEY INPUT FIELD FROM UI
    
    st.header("📄 Document Upload")
    uploaded_file = st.file_uploader("Upload PDF", type=["pdf"])
    
    if uploaded_file and st.button("Process Document"):
        with st.spinner("Extracting, Chunking, and Indexing..."):
            chunks = process_pdf(uploaded_file)
            
            # New safety check to prevent ZeroDivisionError
            if not chunks:
                st.error("Error: Could not extract any text. Ensure the PDF contains digital text, not scanned images.")
            else:
                st.session_state.engine.index_documents(chunks)
                st.session_state.is_indexed = True
                st.success(f"Indexed {len(chunks)} chunks!")

if not st.session_state.is_indexed:
    st.info("👈 Please upload a PDF and index it to begin.")
else:
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg["role"] == "assistant" and "chunks" in msg:
                with st.expander("View Retrieved Context"):
                    for i, chunk in enumerate(msg["chunks"]):
                        st.markdown(f"**Chunk {i+1}:**\n```\n{chunk}\n```")

    query = st.chat_input("Ask a question about the PDF...")
    
    if query:
        st.session_state.chat_history.append({"role": "user", "content": query})
        with st.chat_message("user"):
            st.markdown(query)
        
        with st.chat_message("assistant"):
            with st.spinner("Retrieving context & generating answer..."):
                relevant_chunks = st.session_state.engine.retrieve(query, top_k=3)
                combined_context = "\n\n---\n\n".join(relevant_chunks)
                
                try:
                    # 4. REMOVED API KEY VARIABLE FROM FUNCTION CALL
                    answer = generate_answer(query, combined_context)
                    st.markdown(answer)
                    
                    st.session_state.chat_history.append({
                        "role": "assistant", 
                        "content": answer,
                        "chunks": relevant_chunks
                    })
                    
                    with st.expander("View Retrieved Context"):
                        for i, chunk in enumerate(relevant_chunks):
                            st.markdown(f"**Chunk {i+1}:**\n```\n{chunk}\n```")
                            
                except Exception as e:
                    st.error(f"API Error: {str(e)}")