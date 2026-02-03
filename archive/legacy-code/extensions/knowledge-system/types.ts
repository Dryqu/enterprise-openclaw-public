/**
 * Knowledge Graph Type Definitions
 * Defines the core data structures for the knowledge graph system
 */

/**
 * Represents a node in the knowledge graph
 */
export interface GraphNode {
  /** Unique identifier for the node */
  id: string;

  /** Content/text associated with the node */
  content: string;

  /** Optional vector embedding for similarity search */
  embedding?: number[];

  /** Optional metadata for additional node properties */
  metadata?: Record<string, any>;

  /** Optional type/category for the node */
  type?: string;
}

/**
 * Represents an edge connecting two nodes in the knowledge graph
 */
export interface GraphEdge {
  /** Unique identifier for the edge */
  id: string;

  /** Source node ID */
  source: string;

  /** Target node ID */
  target: string;

  /** Type of relationship (e.g., 'related_to', 'depends_on') */
  type: string;

  /** Optional weight for weighted graph algorithms */
  weight?: number;

  /** Optional metadata for additional edge properties */
  metadata?: Record<string, any>;
}

/**
 * Options for graph traversal algorithms
 */
export interface TraversalOptions {
  /** Maximum depth to traverse (default: unlimited) */
  maxDepth?: number;

  /** Filter function for nodes during traversal */
  nodeFilter?: (node: GraphNode) => boolean;

  /** Filter function for edges during traversal */
  edgeFilter?: (edge: GraphEdge) => boolean;
}

/**
 * Query criteria for finding nodes
 */
export interface NodeQuery {
  /** Filter by node type */
  type?: string;

  /** Filter by metadata properties */
  metadata?: Record<string, any>;
}

/**
 * Query criteria for finding edges
 */
export interface EdgeQuery {
  /** Filter by edge type */
  type?: string;

  /** Filter by source node ID */
  source?: string;

  /** Filter by target node ID */
  target?: string;

  /** Filter by metadata properties */
  metadata?: Record<string, any>;
}

/**
 * Direction for neighbor queries
 */
export type NeighborDirection = 'incoming' | 'outgoing' | 'both';

/**
 * Result from similarity search
 */
export interface SimilarityResult {
  /** The node found */
  node: GraphNode;

  /** Similarity score (0-1, higher is more similar) */
  score: number;

  /** Distance metric used */
  distance: number;
}
