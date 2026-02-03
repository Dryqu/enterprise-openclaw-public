/**
 * @enterprise-openclaw/core
 *
 * Open-source core features for Enterprise OpenClaw
 * Licensed under Apache-2.0
 *
 * This package provides:
 * - Knowledge Graph with vector store
 * - Core types and utilities
 */

// Knowledge Graph exports
export { KnowledgeGraph } from './knowledge-graph/knowledge-graph.js';
export { VectorStore } from './knowledge-graph/vector-store.js';
export type { GraphNode, GraphEdge, SimilarityResult, TraversalOptions, NodeQuery, EdgeQuery, NeighborDirection } from './knowledge-graph/types.js';

// Core types
export * from './types.js';
