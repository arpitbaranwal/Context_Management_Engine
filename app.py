import os
import re
from typing import Any, Dict, List, Set
import streamlit as st
import google.generativeai as genai
from dotenv import load_dotenv

from engine import (
    HybridContextRetriever,
    ReflectiveController,
    WorkingMemoryDesk,
    parse_pdf_to_structured_chunks,
)

# Load environment variables (.env)
load_dotenv()

# Load Gemini API Key strictly from environment
DEFAULT_GEMINI_KEY = os.getenv("GEMINI_API_KEY", "").strip()

CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite",
    "gemini-3.5-flash",
    "gemini-3.8-flash",
    "gemini-3.1-flash-lite",
    "gemini-flash-latest",
]

# ==========================================
# 1. Answer Synthesis Function
# ==========================================
def generate_answer(query: str, context: str, api_key: str = DEFAULT_GEMINI_KEY) -> str:
    """
    Generates a clean, grounded answer via Google Gemini without bracketed internal chunk citations.
    """
    effective_key = (api_key or "").strip() or DEFAULT_GEMINI_KEY
    genai.configure(api_key=effective_key)
    
    prompt = f"""You are an elite research analyst and expert technical educator powered by an advanced Context Management Engine.
Answer the user's Question in an authoritative, thorough, and highly insightful manner based strictly on the provided Context below.

CONTENT & PRESENTATION RULES:
1. Direct & Authoritative Start: Jump directly into the explanation with a crisp high-level summary. NEVER start with robotic meta-announcements such as "Based on the provided context...", "According to the document...", or "In the text provided...".
2. Rich Hierarchical Organization: Structure your response cleanly using descriptive Markdown section headings (`### Overview`, `### Structure of ...`, `### Core Components`, `### Real-Life Example: ...`).
3. In-Depth Component Analysis: When explaining concepts, architectures, or elements, give a comprehensive breakdown of each component, detailing what it is, why it matters, and standard industry terminology (e.g. Type I / Type II errors, false alarm, specific notation).
4. Concrete Real-World Examples: When asked for examples or real-world application, provide a vivid, detailed real-life scenario comparing contrasting operational domains (e.g. high-stakes security/defense facility vs retail store discounts) to explain why the cost of errors varies.
5. Clean Technical Notation: Present equations, metrics, and symbols cleanly. Write standalone equations on their own lines or use natural terms (e.g., F1 score, True Positive Rate). Avoid awkward LaTeX syntax, escaped braces, or raw textbook index clutter ($x_i^{(2)}$, $y_i$) in bullet headings.
6. Strictly Grounded: Ground every fact and definition directly in the Context. You may rephrase, synthesize, and use intuitive analogies to make the explanation vivid and thorough, but do not introduce contradictory or outside facts.
7. Missing Context: Only if the Context has no relevant information to answer the question, output exactly: "The information is not provided in the document."
8. No Bracketed Internal IDs: Never output internal chunk markers like [doc_chunk_1], [S1], or [DSML_p20] in the text.

Context:
{context}

Question: {query}
Answer:"""

    last_error = None
    for model_name in CANDIDATE_MODELS:
        try:
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt, request_options={"retry": None})
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            last_error = e
            continue

    if last_error is not None:
        raise RuntimeError(f"All candidate Gemini models failed. Last API error: {str(last_error)}")

    return "The information is not provided in the document."


# ==========================================
# 2. Streamlit Page Configuration & State
# ==========================================
st.set_page_config(
    page_title="Context Management Engine",
    page_icon="🧠",
    layout="wide",
)

# Custom Subtle Styling for sleek, market-friendly dark theme
st.markdown(
    """
    <style>
    /* Subtle Modern Button Styling */
    div[data-testid="stSidebar"] button[kind="primary"] {
        background: #3B82F6 !important;
        border: none !important;
        border-radius: 8px !important;
        font-weight: 500 !important;
        color: #FFFFFF !important;
        transition: all 0.2s ease !important;
    }
    div[data-testid="stSidebar"] button[kind="primary"]:hover {
        background: #2563EB !important;
        box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25) !important;
    }
    div[data-testid="stSidebar"] button[kind="secondary"] {
        border-radius: 8px !important;
        font-weight: 500 !important;
        border: 1px solid rgba(255, 255, 255, 0.12) !important;
        background: rgba(255, 255, 255, 0.03) !important;
        transition: all 0.2s ease !important;
    }
    div[data-testid="stSidebar"] button[kind="secondary"]:hover {
        border-color: rgba(255, 255, 255, 0.25) !important;
        background: rgba(255, 255, 255, 0.06) !important;
    }
    </style>
    """,
    unsafe_allow_html=True,
)

st.title("Context Management Engine")
st.caption("Intelligent document research and grounded Q&A across your knowledge base.")

# Initialize Session State
if "retriever" not in st.session_state:
    st.session_state.retriever = HybridContextRetriever()
if "memory_desk" not in st.session_state:
    st.session_state.memory_desk = WorkingMemoryDesk(max_token_budget=2000)
if "is_indexed" not in st.session_state:
    st.session_state.is_indexed = False
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "last_telemetry" not in st.session_state:
    st.session_state.last_telemetry = None
if "indexed_docs" not in st.session_state:
    st.session_state.indexed_docs = []


# ==========================================
# 3. Sidebar (Knowledge Base & Sources)
# ==========================================
with st.sidebar:
    st.markdown("### 📁 Knowledge Base")
    st.caption("Upload and manage your source documents.")

    uploaded_files = st.file_uploader(
        "Drop PDFs here",
        type=["pdf"],
        accept_multiple_files=True,
        label_visibility="collapsed",
        help="Select or drag-and-drop one or more PDF files to analyze.",
    )

    col_btn1, col_btn2 = st.columns(2)
    with col_btn1:
        process_clicked = st.button("Analyze", use_container_width=True, type="primary")
    with col_btn2:
        reset_clicked = st.button("Reset", use_container_width=True)

    if reset_clicked:
        st.session_state.retriever = HybridContextRetriever()
        st.session_state.memory_desk = WorkingMemoryDesk(max_token_budget=2000)
        st.session_state.is_indexed = False
        st.session_state.chat_history = []
        st.session_state.last_telemetry = None
        st.session_state.indexed_docs = []
        st.rerun()

    if uploaded_files and process_clicked:
        with st.spinner(f"Analyzing {len(uploaded_files)} document(s)..."):
            all_chunks = []
            files_processed = []
            files_failed = []

            for f in uploaded_files:
                try:
                    f.seek(0)
                    pdf_bytes = f.read()
                    f_chunks = parse_pdf_to_structured_chunks(pdf_bytes, f.name)
                    if f_chunks:
                        all_chunks.extend(f_chunks)
                        f_size = getattr(f, "size", 0) or len(pdf_bytes)
                        if f_size < 1024 * 1024:
                            size_str = f"{f_size / 1024:.1f} KB"
                        else:
                            size_str = f"{f_size / (1024 * 1024):.1f} MB"

                        files_processed.append((f.name, len(f_chunks)))

                        # Store or update doc metadata in indexed_docs
                        existing_idx = next(
                            (
                                i
                                for i, d in enumerate(st.session_state.indexed_docs)
                                if (d.get("name") if isinstance(d, dict) else d) == f.name
                            ),
                            None,
                        )
                        doc_info = {
                            "name": f.name,
                            "size": size_str,
                            "chunks": len(f_chunks),
                        }
                        if existing_idx is not None:
                            st.session_state.indexed_docs[existing_idx] = doc_info
                        else:
                            st.session_state.indexed_docs.append(doc_info)
                    else:
                        files_failed.append(f.name)
                except Exception as ex:
                    files_failed.append(f"{f.name} ({str(ex)})")

            if files_failed:
                st.warning(
                    f"⚠️ Could not extract text from: {', '.join(files_failed)}. "
                    f"Ensure they contain digital text, not scanned images."
                )

            if all_chunks:
                st.session_state.retriever.index_chunks(all_chunks)
                st.session_state.is_indexed = True
                st.toast(
                    f"Successfully analyzed {len(files_processed)} document(s) ({len(all_chunks)} chunks).",
                    icon="✅",
                )
            elif not files_failed:
                st.error("Error: Could not extract any text from the uploaded files.")

    st.markdown("---")

    # Active Sources Header
    active_docs_count = len(st.session_state.indexed_docs)
    st.markdown(f"**Active Sources ({active_docs_count})**")

    # Render active documents in a sleek subtle card layout
    if st.session_state.indexed_docs:
        for doc in st.session_state.indexed_docs:
            if isinstance(doc, dict):
                d_name = doc.get("name", "Document")
                d_size = doc.get("size", "")
                d_chunks = doc.get("chunks", 0)
            else:
                d_name = str(doc)
                d_size = ""
                d_chunks = 0

            chunks_badge = (
                f'<span style="font-size: 0.70rem; color: #94A3B8;">{d_chunks} chunks</span>'
                if d_chunks
                else ""
            )
            size_badge = (
                f'<span style="font-size: 0.72rem; color: #94A3B8; background: rgba(255, 255, 255, 0.06); padding: 2px 7px; border-radius: 4px; white-space: nowrap; margin-left: 8px;">{d_size}</span>'
                if d_size
                else ""
            )

            card_html = f"""<div style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; margin-bottom: 7px; background: rgba(255, 255, 255, 0.035); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px;"><div style="display: flex; align-items: center; gap: 8px; overflow: hidden; min-width: 0;"><span style="font-size: 1rem;">📄</span><div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;"><div style="font-size: 0.82rem; font-weight: 500; color: #F1F5F9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="{d_name}">{d_name}</div>{chunks_badge}</div></div>{size_badge}</div>"""
            st.markdown(card_html, unsafe_allow_html=True)
    else:
        st.caption("No documents currently active.")

    # Subtle Collapsible Telemetry for advanced inspection
    st.markdown("---")
    with st.expander("⚡ System Telemetry", expanded=False):
        desk = st.session_state.memory_desk
        used_tok = desk.used_tokens
        max_tok = desk.max_token_budget
        ratio = min(1.0, used_tok / max(max_tok, 1))

        st.caption("Working Memory Usage")
        st.progress(ratio, text=f"{used_tok}/{max_tok} words ({ratio:.1%})")
        st.caption(f"Active Slots: `{len(desk.active_slots)}` · Evictions: `{len(desk.eviction_log)}`")

        telem = st.session_state.last_telemetry
        if telem:
            st.markdown("---")
            st.caption("Last Retrieval Performance")
            status = telem["decision"].status
            icon = "🟢" if status == "PROCEED" else "🛑"
            st.markdown(f"**Gate:** {icon} `{status}`")
            st.markdown(f"**Confidence:** `{telem['decision'].confidence_score:.4f}`")
            st.markdown(f"**Latency:** `{telem['latency_ms']:.1f} ms`")
            st.markdown(f"**Selected Chunks:** `{len(telem['selected_chunks'])}`")


# ==========================================
# 4. Main Chat Interface & Multi-Hop Loop
# ==========================================
if not st.session_state.is_indexed:
    st.markdown(
        """
        <div style="text-align: center; padding: 50px 20px; margin: 30px auto; max-width: 520px; background: rgba(255, 255, 255, 0.02); border: 1px dashed rgba(255, 255, 255, 0.1); border-radius: 12px;">
            <div style="font-size: 2.2rem; margin-bottom: 10px;">📄</div>
            <div style="font-size: 1.1rem; font-weight: 600; color: #F1F5F9; margin-bottom: 6px;">Knowledge Base Empty</div>
            <div style="font-size: 0.86rem; color: #94A3B8; line-height: 1.5;">
                Upload your PDF documents in the sidebar and click <b>Analyze</b> to start asking questions.
            </div>
        </div>
        """,
        unsafe_allow_html=True,
    )
else:
    # Display Chat History
    for msg in st.session_state.chat_history:
        with st.chat_message(msg["role"]):
            st.markdown(msg["content"])
            if msg["role"] == "assistant" and "telemetry" in msg:
                t = msg["telemetry"]
                with st.expander("🔍 View Grounded Sources", expanded=False):
                    c1, c2, c3 = st.columns(3)
                    with c1:
                        st.markdown(f"**Status:** `{t['decision'].status}`")
                    with c2:
                        st.markdown(f"**Confidence:** `{t['decision'].confidence_score:.3f}`")
                    with c3:
                        st.markdown(f"**Latency:** `{t['latency_ms']:.1f} ms`")

                    if t.get("active_slots"):
                        st.markdown("---")
                        for idx, s in enumerate(t["active_slots"]):
                            p_info = f" — {s['header']}" if s.get("header") else ""
                            st.markdown(
                                f"**Source {idx+1} (Page {s['page']}{p_info}):**\n"
                                f"```\n{s['text']}\n```"
                            )

    # Chat Input
    query = st.chat_input("Ask a question about your documents...")
    if query:
        st.session_state.chat_history.append({"role": "user", "content": query})
        with st.chat_message("user"):
            st.markdown(query)

        with st.chat_message("assistant"):
            with st.spinner("Analyzing context and retrieving relevant sections..."):
                # ----------------------------------------------------
                # Step 0: Dimension 3 Conversational Query Expansion
                # ----------------------------------------------------
                expanded_query = ReflectiveController.expand_follow_up_query(
                    query, st.session_state.chat_history
                )

                # ----------------------------------------------------
                # Step 1: Dimension 3 Pre-Check (Query Decomposition)
                # ----------------------------------------------------
                sub_queries = ReflectiveController.decompose_query(expanded_query)

                # ----------------------------------------------------
                # Step 2: Dimension 1 Spatial Hybrid Search
                # ----------------------------------------------------
                merged_candidates_map: Dict[str, Dict[str, Any]] = {}
                all_rrf_scores: List[float] = []
                all_coverages: List[float] = []
                total_latency_ms = 0.0

                for sq in sub_queries:
                    res = st.session_state.retriever.retrieve_dynamic(sq)
                    total_latency_ms += res.get("latency_ms", 0.0)
                    all_rrf_scores.extend(res.get("rrf_scores", []))
                    all_coverages.extend(res.get("bm25f_coverages", []))
                    for chk in res.get("selected_chunks", []):
                        cid = chk["chunk_id"]
                        if cid not in merged_candidates_map:
                            merged_candidates_map[cid] = chk
                        else:
                            if chk["normalized_score"] > merged_candidates_map[cid]["normalized_score"]:
                                merged_candidates_map[cid] = chk

                merged_candidates = list(merged_candidates_map.values())

                # ----------------------------------------------------
                # Step 3: Dimension 3 Post-Check (Retrieval Confidence Gate)
                # ----------------------------------------------------
                has_prior_context = (
                    len(st.session_state.memory_desk.active_slots) > 0
                    or len(st.session_state.chat_history) >= 2
                )
                decision = ReflectiveController.evaluate_retrieval_confidence(
                    all_rrf_scores,
                    all_coverages,
                    sub_queries,
                    has_prior_context=has_prior_context,
                )

                # Build Telemetry Record
                telemetry: Dict[str, Any] = {
                    "original_query": query,
                    "expanded_query": expanded_query,
                    "sub_queries": sub_queries,
                    "selected_chunks": merged_candidates,
                    "latency_ms": round(total_latency_ms, 2),
                    "decision": decision,
                    "active_slots": [],
                    "used_tokens": st.session_state.memory_desk.used_tokens,
                }
                st.session_state.last_telemetry = telemetry

                # Check Confidence Gate
                if decision.status == "ABSTAIN_LOW_CONFIDENCE":
                    warning_msg = (
                        "ℹ️ **I couldn't find sufficient information in the uploaded documents to answer this question accurately.**\n\n"
                        "To ensure factual reliability, answers are only generated when directly grounded in your sources. Try rephrasing your question or checking if the relevant topic is present in your documents."
                    )
                    st.info(warning_msg)
                    st.session_state.chat_history.append({
                        "role": "assistant",
                        "content": warning_msg,
                        "telemetry": telemetry,
                    })
                else:
                    # ----------------------------------------------------
                    # Step 4: Dimension 2 Working Memory Desk Allocation
                    # ----------------------------------------------------
                    active_slots = st.session_state.memory_desk.allocate_turn_context(merged_candidates)
                    telemetry["active_slots"] = [
                        {
                            "chunk_id": s.chunk_id,
                            "text": s.text,
                            "page": s.page,
                            "header": s.header,
                            "is_pinned": s.is_pinned,
                            "token_count": s.token_count,
                        }
                        for s in active_slots
                    ]
                    telemetry["used_tokens"] = st.session_state.memory_desk.used_tokens
                    st.session_state.last_telemetry = telemetry

                    # ----------------------------------------------------
                    # Step 5: Grounded Gemini Generation
                    # ----------------------------------------------------
                    # Assemble context from the entire active working memory desk (OS-style memory retention)
                    desk_chunks = st.session_state.memory_desk.get_active_chunks()
                    formatted_context = "\n\n---\n\n".join(
                        [
                            f"Document Section (Page {s.page}{' - ' + s.header if s.header else ''}):\n{s.text}"
                            for s in desk_chunks
                        ]
                    )

                    try:
                        if " -> " in expanded_query:
                            parts = expanded_query.split(" -> ", 1)
                            prior_context_topic = parts[0].strip()
                            follow_up_query = parts[1].strip()
                            effective_query = f"In the context of the previous discussion on '{prior_context_topic}': {follow_up_query}"
                        else:
                            effective_query = query
                        raw_answer = generate_answer(effective_query, formatted_context, api_key=DEFAULT_GEMINI_KEY)

                        # Strip any accidental bracketed chunk tags, extra spaces, or duplicate periods
                        clean_answer = re.sub(r"\s*\[[A-Za-z0-9_\-\.\s,]*_p\d+_c\d+[A-Za-z0-9_\-\.\s,]*\]", "", raw_answer)
                        clean_answer = re.sub(r"\s*\[[A-Za-z0-9_\-\.\s,]*c\d+[A-Za-z0-9_\-\.\s,]*\]", "", clean_answer)
                        clean_answer = re.sub(r"\s*\[chunk_[a-zA-Z0-9_\-]+\]", "", clean_answer)
                        clean_answer = re.sub(r"\s+([.,;:!?])", r"\1", clean_answer)
                        clean_answer = re.sub(r"\.{2,}", ".", clean_answer).strip()

                        st.markdown(clean_answer)

                        # Register active slots in Working Memory Desk so utility & pinning stay active
                        active_chunk_ids = {s.chunk_id for s in desk_chunks}
                        if active_chunk_ids:
                            st.session_state.memory_desk.register_llm_citations(active_chunk_ids)

                        st.session_state.chat_history.append({
                            "role": "assistant",
                            "content": clean_answer,
                            "telemetry": telemetry,
                        })

                        with st.expander("🔍 View Grounded Sources", expanded=False):
                            c1, c2, c3 = st.columns(3)
                            with c1:
                                st.markdown(f"**Status:** `{decision.status}`")
                            with c2:
                                st.markdown(f"**Confidence:** `{decision.confidence_score:.3f}`")
                            with c3:
                                st.markdown(f"**Latency:** `{total_latency_ms:.1f} ms`")

                            st.markdown("---")
                            for idx, slot in enumerate(active_slots):
                                p_info = f" — {slot.header}" if slot.header else ""
                                st.markdown(
                                    f"**Source {idx+1} (Page {slot.page}{p_info}):**\n"
                                    f"```\n{slot.text}\n```"
                                )

                    except Exception as e:
                        st.error(f"Generation API Error: {str(e)}")
