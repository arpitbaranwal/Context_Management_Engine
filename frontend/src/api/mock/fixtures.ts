/**
 * DEMO DATA ONLY. Everything in this file is invented sample text used by the
 * mock adapter so the UI can be developed without the backend.
 */
export const SAMPLE_PASSAGES: string[] = [
  'Hybrid retrieval combines a lexical ranker such as BM25 with a dense vector search. The lexical side rewards exact term overlap, which matters for names, acronyms and numbers. The dense side captures paraphrase and intent, so a question can match a passage that shares few of its words.',
  'A common limitation of hybrid retrieval is that the two rankers produce scores on different scales. Taking the union of both candidate lists avoids the scaling problem but passes more passages to the model than a single ranker would, which increases context length and cost.',
  'Documents are split into overlapping windows before indexing. A window of one thousand characters with two hundred characters of overlap keeps sentences that straddle a boundary available in at least one chunk, at the price of storing some text twice.',
  'Exact nearest-neighbour search over embeddings compares the query vector with every stored vector. It returns the true closest passages and needs no tuning, but its cost grows linearly with the number of chunks, so it suits collections of modest size.',
  'Grounded generation instructs the model to answer only from the supplied context. When the context does not mention the topic, the preferred behaviour is an explicit statement that the information is not provided rather than an answer drawn from general knowledge.',
  'Evaluating a retrieval pipeline separately from the generator makes failures easier to diagnose. If the right passage never reaches the model, no prompt change will fix the answer; if it does arrive and the answer is still wrong, the problem lies in generation.',
  'Query cleaning removes conversational filler such as "please explain" or "in simple terms" before lexical matching. Those words appear in almost every passage and add noise to term-frequency scoring, while the semantic search still receives the full question.',
  'Optical character recognition converts scanned pages and photographs into text. Recognition quality depends on resolution and layout, and recognition errors propagate into every later stage, so a poor scan can lower retrieval quality for that document.',
]

export const SEED_DOCUMENTS = [
  { name: 'sample-hybrid-retrieval.pdf', type: 'pdf' as const, size: 482_100, pages: 6, passages: [0, 1, 6, 3, 4, 2], ms: 2400 },
  { name: 'sample-rag-evaluation.pdf', type: 'pdf' as const, size: 311_870, pages: 4, passages: [5, 4, 2, 7], ms: 1700 },
]
