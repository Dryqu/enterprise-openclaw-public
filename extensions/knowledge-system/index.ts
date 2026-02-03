/**
 * Knowledge Graph System
 *
 * A production-ready knowledge graph with vector search capabilities.
 *
 * @module knowledge-system
 */

export { KnowledgeGraph } from './knowledge-graph.js';
export { VectorStore } from './vector-store.js';
export type {
  GraphNode,
  GraphEdge,
  TraversalOptions,
  NodeQuery,
  EdgeQuery,
  NeighborDirection,
  SimilarityResult
} from './types.js';
