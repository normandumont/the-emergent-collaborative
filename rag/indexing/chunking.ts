export const CHUNKING = {
  type: "static",
  static: { max_chunk_size_tokens: 800, chunk_overlap_tokens: 100 },
} as const;
