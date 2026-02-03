/**
 * Vector Store - LanceDB Integration
 * Handles vector storage and similarity search operations
 */

import * as lancedb from '@lancedb/lancedb';
import { GraphNode, GraphEdge } from './types.js';

/**
 * VectorStore manages LanceDB connections and operations
 */
export class VectorStore {
  private db: any;
  private dbPath: string;
  private initialized: boolean = false;
  private readonly EMBEDDING_DIM = 384;

  constructor(dbPath: string) {
    this.dbPath = dbPath;
  }

  /**
   * Initialize the database connection and create tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.db = await lancedb.connect(this.dbPath);
      this.initialized = true; // Set before creating tables to avoid circular dependency

      // Ensure tables are created
      await this.getNodesTable();
      await this.getEdgesTable();
    } catch (error: any) {
      this.initialized = false; // Reset on error
      throw new Error(`Failed to initialize LanceDB: ${error.message}`);
    }
  }

  /**
   * Check if the vector store is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get or create the nodes table
   */
  async getNodesTable(): Promise<any> {
    this.ensureInitialized();

    const tableNames = await this.db.tableNames();

    if (tableNames.includes('nodes')) {
      return await this.db.openTable('nodes');
    }

    // Create table with initial record
    const initialData = [{
      id: '__init__',
      content: 'initialization record',
      embedding: new Array(this.EMBEDDING_DIM).fill(0),
      metadata: JSON.stringify({}),
      type: '__init__',
      has_embedding: false
    }];

    const table = await this.db.createTable('nodes', initialData);
    return table;
  }

  /**
   * Clean initialization record from nodes table
   */
  private async cleanInitRecord(table: any): Promise<void> {
    try {
      await table.delete('id = "__init__"');
    } catch {
      // Ignore if record doesn't exist
    }
  }

  /**
   * Get or create the edges table
   */
  async getEdgesTable(): Promise<any> {
    this.ensureInitialized();

    const tableNames = await this.db.tableNames();

    if (tableNames.includes('edges')) {
      return await this.db.openTable('edges');
    }

    // Create table with initial record
    const initialData = [{
      id: '__init__',
      source: '__init__',
      target: '__init__',
      type: '__init__',
      weight: 0,
      metadata: JSON.stringify({})
    }];

    const table = await this.db.createTable('edges', initialData);
    return table;
  }

  /**
   * Add a node to the vector store
   */
  async addNode(node: GraphNode): Promise<void> {
    this.ensureInitialized();

    const table = await this.getNodesTable();

    // Validate embedding if provided
    if (node.embedding && node.embedding.length !== this.EMBEDDING_DIM) {
      throw new Error(
        `Invalid embedding dimension. Expected ${this.EMBEDDING_DIM}, got ${node.embedding.length}`
      );
    }

    const record = {
      id: node.id,
      content: node.content,
      embedding: node.embedding || new Array(this.EMBEDDING_DIM).fill(0),
      metadata: JSON.stringify(node.metadata || {}),
      type: node.type || '',
      has_embedding: !!node.embedding
    };

    await table.add([record]);
  }

  /**
   * Get a node by ID
   */
  async getNode(id: string): Promise<GraphNode | undefined> {
    this.ensureInitialized();

    const table = await this.getNodesTable();

    // Query all and filter in memory for now (LanceDB API constraints)
    const allRecords = await table.query().limit(10000).toArray();
    const found = allRecords.find((r: any) => r.id === id);

    if (!found) {
      return undefined;
    }

    return this.deserializeNode(found);
  }

  /**
   * Update a node in the vector store
   */
  async updateNode(id: string, updates: Partial<GraphNode>): Promise<void> {
    this.ensureInitialized();

    const existingNode = await this.getNode(id);
    if (!existingNode) {
      throw new Error(`Node with id "${id}" not found`);
    }

    // Delete old record
    await this.deleteNode(id);

    // Add updated record
    const updatedNode: GraphNode = {
      ...existingNode,
      ...updates,
      id: existingNode.id // Ensure ID doesn't change
    };

    await this.addNode(updatedNode);
  }

  /**
   * Delete a node from the vector store
   */
  async deleteNode(id: string): Promise<void> {
    this.ensureInitialized();

    const table = await this.getNodesTable();
    await table.delete(`id = '${id}'`);
  }

  /**
   * Query nodes by criteria
   */
  async queryNodes(criteria: { type?: string; metadata?: Record<string, any> }): Promise<GraphNode[]> {
    this.ensureInitialized();

    const table = await this.getNodesTable();
    const allRecords = await table.query().limit(10000).toArray();

    let filtered = allRecords.filter((r: any) => r.id !== '__init__');

    if (criteria.type) {
      filtered = filtered.filter((r: any) => r.type === criteria.type);
    }

    const nodes = filtered.map((r: any) => this.deserializeNode(r));

    // Filter by metadata if provided
    if (criteria.metadata) {
      return nodes.filter((node: GraphNode) => {
        if (!node.metadata) return false;
        return Object.entries(criteria.metadata!).every(
          ([key, value]) => node.metadata![key] === value
        );
      });
    }

    return nodes;
  }

  /**
   * Get all nodes
   */
  async getAllNodes(): Promise<GraphNode[]> {
    this.ensureInitialized();

    const table = await this.getNodesTable();
    const allRecords = await table.query().limit(10000).toArray();
    const filtered = allRecords.filter((r: any) => r.id !== '__init__');

    return filtered.map((r: any) => this.deserializeNode(r));
  }

  /**
   * Find similar nodes using vector similarity search
   */
  async findSimilarNodes(embedding: number[], topK: number): Promise<GraphNode[]> {
    this.ensureInitialized();

    if (embedding.length !== this.EMBEDDING_DIM) {
      throw new Error(
        `Invalid embedding dimension. Expected ${this.EMBEDDING_DIM}, got ${embedding.length}`
      );
    }

    const table = await this.getNodesTable();

    // Only search nodes that have embeddings
    const results = await table
      .search(embedding)
      .where('has_embedding = true')
      .limit(topK)
      .toArray();

    return results.map((r: any) => this.deserializeNode(r));
  }

  /**
   * Add an edge to the vector store
   */
  async addEdge(edge: GraphEdge): Promise<void> {
    this.ensureInitialized();

    const table = await this.getEdgesTable();

    const record = {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      type: edge.type,
      weight: edge.weight || 1.0,
      metadata: JSON.stringify(edge.metadata || {})
    };

    await table.add([record]);
  }

  /**
   * Get an edge by ID
   */
  async getEdge(id: string): Promise<GraphEdge | undefined> {
    this.ensureInitialized();

    const table = await this.getEdgesTable();
    const allRecords = await table.query().limit(10000).toArray();
    const found = allRecords.find((r: any) => r.id === id);

    if (!found) {
      return undefined;
    }

    return this.deserializeEdge(found);
  }

  /**
   * Update an edge in the vector store
   */
  async updateEdge(id: string, updates: Partial<GraphEdge>): Promise<void> {
    this.ensureInitialized();

    const existingEdge = await this.getEdge(id);
    if (!existingEdge) {
      throw new Error(`Edge with id "${id}" not found`);
    }

    // Delete old record
    await this.deleteEdge(id);

    // Add updated record
    const updatedEdge: GraphEdge = {
      ...existingEdge,
      ...updates,
      id: existingEdge.id // Ensure ID doesn't change
    };

    await this.addEdge(updatedEdge);
  }

  /**
   * Delete an edge from the vector store
   */
  async deleteEdge(id: string): Promise<void> {
    this.ensureInitialized();

    const table = await this.getEdgesTable();
    await table.delete(`id = '${id}'`);
  }

  /**
   * Query edges by criteria
   */
  async queryEdges(criteria: {
    type?: string;
    source?: string;
    target?: string;
  }): Promise<GraphEdge[]> {
    this.ensureInitialized();

    const table = await this.getEdgesTable();
    const allRecords = await table.query().limit(10000).toArray();

    let filtered = allRecords.filter((r: any) => r.id !== '__init__');

    if (criteria.type) {
      filtered = filtered.filter((r: any) => r.type === criteria.type);
    }
    if (criteria.source) {
      filtered = filtered.filter((r: any) => r.source === criteria.source);
    }
    if (criteria.target) {
      filtered = filtered.filter((r: any) => r.target === criteria.target);
    }

    return filtered.map((r: any) => this.deserializeEdge(r));
  }

  /**
   * Get all edges
   */
  async getAllEdges(): Promise<GraphEdge[]> {
    this.ensureInitialized();

    const table = await this.getEdgesTable();
    const allRecords = await table.query().limit(10000).toArray();
    const filtered = allRecords.filter((r: any) => r.id !== '__init__');

    return filtered.map((r: any) => this.deserializeEdge(r));
  }

  /**
   * Get table names
   */
  async getTableNames(): Promise<string[]> {
    this.ensureInitialized();
    return await this.db.tableNames();
  }

  /**
   * Close the database connection
   */
  async close(): Promise<void> {
    this.initialized = false;
    // LanceDB doesn't require explicit close
  }

  /**
   * Ensure the vector store is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('VectorStore not initialized. Call initialize() first.');
    }
  }

  /**
   * Deserialize a node from database format
   */
  private deserializeNode(record: any): GraphNode {
    const node: GraphNode = {
      id: record.id,
      content: record.content
    };

    if (record.has_embedding && record.embedding) {
      node.embedding = Array.from(record.embedding);
    }

    if (record.type) {
      node.type = record.type;
    }

    if (record.metadata) {
      try {
        node.metadata = JSON.parse(record.metadata);
      } catch {
        node.metadata = {};
      }
    }

    return node;
  }

  /**
   * Deserialize an edge from database format
   */
  private deserializeEdge(record: any): GraphEdge {
    const edge: GraphEdge = {
      id: record.id,
      source: record.source,
      target: record.target,
      type: record.type
    };

    if (record.weight !== undefined && record.weight !== 1.0) {
      edge.weight = record.weight;
    }

    if (record.metadata) {
      try {
        edge.metadata = JSON.parse(record.metadata);
      } catch {
        edge.metadata = {};
      }
    }

    return edge;
  }
}
