/**
 * Knowledge Graph - Main Implementation
 * Provides graph operations, traversal algorithms, and query interface
 */

import { VectorStore } from './vector-store.js';
import {
  GraphNode,
  GraphEdge,
  TraversalOptions,
  NodeQuery,
  EdgeQuery,
  NeighborDirection
} from './types.js';

/**
 * KnowledgeGraph provides a complete graph database with vector search capabilities
 */
export class KnowledgeGraph {
  private vectorStore: VectorStore;
  private initialized: boolean = false;

  constructor(dbPath: string) {
    this.vectorStore = new VectorStore(dbPath);
  }

  /**
   * Initialize the knowledge graph
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.vectorStore.initialize();
    this.initialized = true;
  }

  /**
   * Check if the graph is initialized
   */
  async isInitialized(): Promise<boolean> {
    return this.initialized;
  }

  /**
   * Get available tables
   */
  async getTables(): Promise<string[]> {
    this.ensureInitialized();
    return await this.vectorStore.getTableNames();
  }

  /**
   * Close the knowledge graph and cleanup resources
   */
  async close(): Promise<void> {
    await this.vectorStore.close();
    this.initialized = false;
  }

  // ========== Node Operations ==========

  /**
   * Add a new node to the graph
   */
  async addNode(node: GraphNode): Promise<void> {
    this.ensureInitialized();
    this.validateNode(node);

    // Check if node already exists
    const existing = await this.vectorStore.getNode(node.id);
    if (existing) {
      throw new Error(`Node with id "${node.id}" already exists`);
    }

    await this.vectorStore.addNode(node);
  }

  /**
   * Get a node by ID
   */
  async getNode(id: string): Promise<GraphNode | undefined> {
    this.ensureInitialized();
    return await this.vectorStore.getNode(id);
  }

  /**
   * Update an existing node
   */
  async updateNode(id: string, updates: Partial<GraphNode>): Promise<void> {
    this.ensureInitialized();

    const existing = await this.vectorStore.getNode(id);
    if (!existing) {
      throw new Error(`Node with id "${id}" not found`);
    }

    // Validate updates
    if (updates.embedding) {
      this.validateEmbedding(updates.embedding);
    }

    await this.vectorStore.updateNode(id, updates);
  }

  /**
   * Delete a node and all connected edges
   */
  async deleteNode(id: string): Promise<void> {
    this.ensureInitialized();

    const existing = await this.vectorStore.getNode(id);
    if (!existing) {
      throw new Error(`Node with id "${id}" not found`);
    }

    // Delete all edges connected to this node
    const edges = await this.vectorStore.getAllEdges();
    for (const edge of edges) {
      if (edge.source === id || edge.target === id) {
        await this.vectorStore.deleteEdge(edge.id);
      }
    }

    // Delete the node
    await this.vectorStore.deleteNode(id);
  }

  /**
   * Query nodes by criteria
   */
  async queryNodes(query: NodeQuery): Promise<GraphNode[]> {
    this.ensureInitialized();
    return await this.vectorStore.queryNodes(query);
  }

  /**
   * Get all nodes in the graph
   */
  async getAllNodes(): Promise<GraphNode[]> {
    this.ensureInitialized();
    return await this.vectorStore.getAllNodes();
  }

  /**
   * Get count of total nodes
   */
  async getNodeCount(): Promise<number> {
    this.ensureInitialized();
    const nodes = await this.vectorStore.getAllNodes();
    return nodes.length;
  }

  // ========== Edge Operations ==========

  /**
   * Add a new edge to the graph
   */
  async addEdge(edge: GraphEdge): Promise<void> {
    this.ensureInitialized();
    this.validateEdge(edge);

    // Verify source and target nodes exist
    const sourceNode = await this.vectorStore.getNode(edge.source);
    if (!sourceNode) {
      throw new Error(`source node "${edge.source}" not found`);
    }

    const targetNode = await this.vectorStore.getNode(edge.target);
    if (!targetNode) {
      throw new Error(`target node "${edge.target}" not found`);
    }

    await this.vectorStore.addEdge(edge);
  }

  /**
   * Get an edge by ID
   */
  async getEdge(id: string): Promise<GraphEdge | undefined> {
    this.ensureInitialized();
    return await this.vectorStore.getEdge(id);
  }

  /**
   * Update an existing edge
   */
  async updateEdge(id: string, updates: Partial<GraphEdge>): Promise<void> {
    this.ensureInitialized();

    const existing = await this.vectorStore.getEdge(id);
    if (!existing) {
      throw new Error(`Edge with id "${id}" not found`);
    }

    await this.vectorStore.updateEdge(id, updates);
  }

  /**
   * Delete an edge
   */
  async deleteEdge(id: string): Promise<void> {
    this.ensureInitialized();
    await this.vectorStore.deleteEdge(id);
  }

  /**
   * Query edges by criteria
   */
  async queryEdges(query: EdgeQuery): Promise<GraphEdge[]> {
    this.ensureInitialized();
    return await this.vectorStore.queryEdges(query);
  }

  /**
   * Get all edges from a node (outgoing)
   */
  async getEdgesFromNode(nodeId: string): Promise<GraphEdge[]> {
    this.ensureInitialized();
    return await this.vectorStore.queryEdges({ source: nodeId });
  }

  /**
   * Get all edges to a node (incoming)
   */
  async getEdgesToNode(nodeId: string): Promise<GraphEdge[]> {
    this.ensureInitialized();
    return await this.vectorStore.queryEdges({ target: nodeId });
  }

  /**
   * Get count of total edges
   */
  async getEdgeCount(): Promise<number> {
    this.ensureInitialized();
    const edges = await this.vectorStore.getAllEdges();
    return edges.length;
  }

  /**
   * Get the degree (number of edges) for a node
   */
  async getNodeDegree(nodeId: string): Promise<number> {
    this.ensureInitialized();
    const outgoing = await this.getEdgesFromNode(nodeId);
    const incoming = await this.getEdgesToNode(nodeId);

    // Count unique edges (avoid double counting self-loops)
    const edgeIds = new Set([
      ...outgoing.map(e => e.id),
      ...incoming.map(e => e.id)
    ]);

    return edgeIds.size;
  }

  // ========== Neighbor Operations ==========

  /**
   * Get neighboring nodes
   */
  async getNeighbors(
    nodeId: string,
    direction: NeighborDirection = 'both'
  ): Promise<GraphNode[]> {
    this.ensureInitialized();

    const neighbors: GraphNode[] = [];
    const neighborIds = new Set<string>();

    if (direction === 'outgoing' || direction === 'both') {
      const outgoingEdges = await this.getEdgesFromNode(nodeId);
      for (const edge of outgoingEdges) {
        neighborIds.add(edge.target);
      }
    }

    if (direction === 'incoming' || direction === 'both') {
      const incomingEdges = await this.getEdgesToNode(nodeId);
      for (const edge of incomingEdges) {
        neighborIds.add(edge.source);
      }
    }

    for (const id of neighborIds) {
      const node = await this.vectorStore.getNode(id);
      if (node) {
        neighbors.push(node);
      }
    }

    return neighbors;
  }

  // ========== Graph Traversal Algorithms ==========

  /**
   * Breadth-First Search traversal
   */
  async bfs(startNodeId: string, options?: TraversalOptions): Promise<GraphNode[]> {
    this.ensureInitialized();

    const startNode = await this.vectorStore.getNode(startNodeId);
    if (!startNode) {
      throw new Error(`Start node "${startNodeId}" not found`);
    }

    const visited = new Set<string>();
    const result: GraphNode[] = [];
    const queue: Array<{ node: GraphNode; depth: number }> = [
      { node: startNode, depth: 0 }
    ];

    visited.add(startNodeId);

    while (queue.length > 0) {
      const { node, depth } = queue.shift()!;

      // Apply node filter and add to result
      if (!options?.nodeFilter || options.nodeFilter(node)) {
        result.push(node);
      }

      // Check max depth
      if (options?.maxDepth !== undefined && depth >= options.maxDepth) {
        continue;
      }

      // Get outgoing edges
      const edges = await this.getEdgesFromNode(node.id);

      for (const edge of edges) {
        // Apply edge filter
        if (options?.edgeFilter && !options.edgeFilter(edge)) {
          continue;
        }

        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          const targetNode = await this.vectorStore.getNode(edge.target);
          if (targetNode) {
            queue.push({ node: targetNode, depth: depth + 1 });
          }
        }
      }
    }

    return result;
  }

  /**
   * Depth-First Search traversal
   */
  async dfs(startNodeId: string, options?: TraversalOptions): Promise<GraphNode[]> {
    this.ensureInitialized();

    const startNode = await this.vectorStore.getNode(startNodeId);
    if (!startNode) {
      throw new Error(`Start node "${startNodeId}" not found`);
    }

    const visited = new Set<string>();
    const result: GraphNode[] = [];

    const dfsRecursive = async (node: GraphNode, depth: number): Promise<void> => {
      visited.add(node.id);

      // Apply node filter
      if (!options?.nodeFilter || options.nodeFilter(node)) {
        result.push(node);
      }

      // Check max depth
      if (options?.maxDepth !== undefined && depth >= options.maxDepth) {
        return;
      }

      // Get outgoing edges
      const edges = await this.getEdgesFromNode(node.id);

      for (const edge of edges) {
        // Apply edge filter
        if (options?.edgeFilter && !options.edgeFilter(edge)) {
          continue;
        }

        if (!visited.has(edge.target)) {
          const targetNode = await this.vectorStore.getNode(edge.target);
          if (targetNode) {
            await dfsRecursive(targetNode, depth + 1);
          }
        }
      }
    };

    await dfsRecursive(startNode, 0);
    return result;
  }

  /**
   * Find shortest path between two nodes using BFS
   */
  async findPath(sourceId: string, targetId: string): Promise<GraphNode[]> {
    this.ensureInitialized();

    // Handle same node case
    if (sourceId === targetId) {
      const node = await this.vectorStore.getNode(sourceId);
      return node ? [node] : [];
    }

    const visited = new Set<string>();
    const queue: Array<{ nodeId: string; path: string[] }> = [
      { nodeId: sourceId, path: [sourceId] }
    ];

    visited.add(sourceId);

    while (queue.length > 0) {
      const { nodeId, path } = queue.shift()!;

      // Get outgoing edges
      const edges = await this.getEdgesFromNode(nodeId);

      for (const edge of edges) {
        if (edge.target === targetId) {
          // Found the target, construct the path
          const fullPath = [...path, targetId];
          const nodes: GraphNode[] = [];

          for (const id of fullPath) {
            const node = await this.vectorStore.getNode(id);
            if (node) {
              nodes.push(node);
            }
          }

          return nodes;
        }

        if (!visited.has(edge.target)) {
          visited.add(edge.target);
          queue.push({
            nodeId: edge.target,
            path: [...path, edge.target]
          });
        }
      }
    }

    // No path found
    return [];
  }

  // ========== Vector Similarity Search ==========

  /**
   * Find nodes similar to a given embedding vector
   */
  async findSimilarNodes(embedding: number[], topK: number): Promise<GraphNode[]> {
    this.ensureInitialized();
    this.validateEmbedding(embedding);

    return await this.vectorStore.findSimilarNodes(embedding, topK);
  }

  // ========== Validation ==========

  /**
   * Validate node structure
   */
  private validateNode(node: GraphNode): void {
    if (!node.id) {
      throw new Error('Node id is required');
    }

    if (typeof node.id !== 'string') {
      throw new Error('Node id must be a string');
    }

    if (!node.content && node.content !== '') {
      throw new Error('Node content is required');
    }

    if (typeof node.content !== 'string') {
      throw new Error('Node content must be a string');
    }

    if (node.embedding) {
      this.validateEmbedding(node.embedding);
    }

    if (node.metadata !== undefined && typeof node.metadata !== 'object') {
      throw new Error('Node metadata must be an object');
    }

    if (node.type !== undefined && typeof node.type !== 'string') {
      throw new Error('Node type must be a string');
    }
  }

  /**
   * Validate edge structure
   */
  private validateEdge(edge: GraphEdge): void {
    if (!edge.id) {
      throw new Error('Edge id is required');
    }

    if (typeof edge.id !== 'string') {
      throw new Error('Edge id must be a string');
    }

    if (!edge.source) {
      throw new Error('Edge source is required');
    }

    if (typeof edge.source !== 'string') {
      throw new Error('Edge source must be a string');
    }

    if (!edge.target) {
      throw new Error('Edge target is required');
    }

    if (typeof edge.target !== 'string') {
      throw new Error('Edge target must be a string');
    }

    if (!edge.type) {
      throw new Error('Edge type is required');
    }

    if (typeof edge.type !== 'string') {
      throw new Error('Edge type must be a string');
    }

    if (edge.weight !== undefined && typeof edge.weight !== 'number') {
      throw new Error('Edge weight must be a number');
    }

    if (edge.metadata !== undefined && typeof edge.metadata !== 'object') {
      throw new Error('Edge metadata must be an object');
    }
  }

  /**
   * Validate embedding vector
   */
  private validateEmbedding(embedding: number[]): void {
    const EMBEDDING_DIM = 384;

    if (!Array.isArray(embedding)) {
      throw new Error('Embedding must be an array');
    }

    if (embedding.length !== EMBEDDING_DIM) {
      throw new Error(
        `Invalid embedding dimension. Expected ${EMBEDDING_DIM}, got ${embedding.length}`
      );
    }

    if (!embedding.every(v => typeof v === 'number')) {
      throw new Error('Embedding must contain only numbers');
    }
  }

  /**
   * Ensure the graph is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('KnowledgeGraph not initialized. Call initialize() first.');
    }
  }
}
