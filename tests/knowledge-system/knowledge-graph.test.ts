import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { KnowledgeGraph } from '../../extensions/knowledge-system/knowledge-graph.js';
import { VectorStore } from '../../extensions/knowledge-system/vector-store.js';
import { GraphNode, GraphEdge, TraversalOptions } from '../../extensions/knowledge-system/types.js';
import * as fs from 'fs';
import * as path from 'path';

describe('KnowledgeGraph - Reality-Grounded TDD', () => {
  let knowledgeGraph: KnowledgeGraph;
  let testDbPath: string;

  beforeEach(async () => {
    // Create unique test database path
    testDbPath = path.join(process.cwd(), 'data', 'test-lancedb-' + Date.now());
    knowledgeGraph = new KnowledgeGraph(testDbPath);
    await knowledgeGraph.initialize();
  });

  afterEach(async () => {
    // Cleanup test database
    await knowledgeGraph.close();
    if (fs.existsSync(testDbPath)) {
      fs.rmSync(testDbPath, { recursive: true, force: true });
    }
  });

  describe('Database Initialization', () => {
    it('should initialize LanceDB connection', async () => {
      expect(knowledgeGraph).toBeDefined();
      const isInitialized = await knowledgeGraph.isInitialized();
      expect(isInitialized).toBe(true);
    });

    it('should create nodes table on initialization', async () => {
      const tables = await knowledgeGraph.getTables();
      expect(tables).toContain('nodes');
    });

    it('should create edges table on initialization', async () => {
      const tables = await knowledgeGraph.getTables();
      expect(tables).toContain('edges');
    });

    it('should handle multiple initialization calls gracefully', async () => {
      await knowledgeGraph.initialize();
      await knowledgeGraph.initialize();
      expect(await knowledgeGraph.isInitialized()).toBe(true);
    });

    it('should throw error when using uninitialized graph', async () => {
      const uninitGraph = new KnowledgeGraph(testDbPath + '-uninit');
      await expect(uninitGraph.addNode({
        id: 'test',
        content: 'test'
      })).rejects.toThrow('not initialized');
    });
  });

  describe('Node Operations - Add', () => {
    it('should add a node without embedding', async () => {
      const node: GraphNode = {
        id: 'node1',
        content: 'Test node content',
        type: 'test'
      };

      await knowledgeGraph.addNode(node);
      const retrieved = await knowledgeGraph.getNode('node1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.id).toBe('node1');
      expect(retrieved?.content).toBe('Test node content');
    });

    it('should add a node with embedding', async () => {
      const embedding = Array.from({ length: 384 }, (_, i) => Math.sin(i) * 0.5);
      const node: GraphNode = {
        id: 'node2',
        content: 'Node with embedding',
        embedding,
        type: 'embedded'
      };

      await knowledgeGraph.addNode(node);
      const retrieved = await knowledgeGraph.getNode('node2');

      expect(retrieved).toBeDefined();
      expect(retrieved?.embedding).toHaveLength(384);
    });

    it('should add a node with metadata', async () => {
      const node: GraphNode = {
        id: 'node3',
        content: 'Node with metadata',
        metadata: {
          author: 'test',
          timestamp: Date.now(),
          tags: ['test', 'metadata']
        }
      };

      await knowledgeGraph.addNode(node);
      const retrieved = await knowledgeGraph.getNode('node3');

      expect(retrieved?.metadata?.author).toBe('test');
      expect(retrieved?.metadata?.tags).toContain('test');
    });

    it('should reject adding duplicate node IDs', async () => {
      const node: GraphNode = {
        id: 'duplicate',
        content: 'First node'
      };

      await knowledgeGraph.addNode(node);
      await expect(knowledgeGraph.addNode(node)).rejects.toThrow('already exists');
    });

    it('should validate required node fields', async () => {
      const invalidNode = {
        content: 'Missing ID'
      } as GraphNode;

      await expect(knowledgeGraph.addNode(invalidNode)).rejects.toThrow('id is required');
    });

    it('should validate embedding dimensionality', async () => {
      const node: GraphNode = {
        id: 'bad-embedding',
        content: 'Wrong embedding size',
        embedding: [1, 2, 3] // Wrong size
      };

      await expect(knowledgeGraph.addNode(node)).rejects.toThrow('embedding dimension');
    });
  });

  describe('Node Operations - Update', () => {
    it('should update node content', async () => {
      await knowledgeGraph.addNode({ id: 'update1', content: 'Original' });

      await knowledgeGraph.updateNode('update1', { content: 'Updated' });
      const retrieved = await knowledgeGraph.getNode('update1');

      expect(retrieved?.content).toBe('Updated');
    });

    it('should update node metadata', async () => {
      await knowledgeGraph.addNode({
        id: 'update2',
        content: 'Test',
        metadata: { version: 1 }
      });

      await knowledgeGraph.updateNode('update2', {
        metadata: { version: 2, updated: true }
      });

      const retrieved = await knowledgeGraph.getNode('update2');
      expect(retrieved?.metadata?.version).toBe(2);
      expect(retrieved?.metadata?.updated).toBe(true);
    });

    it('should update node embedding', async () => {
      const oldEmbedding = Array.from({ length: 384 }, () => 0.1);
      const newEmbedding = Array.from({ length: 384 }, () => 0.9);

      await knowledgeGraph.addNode({
        id: 'update3',
        content: 'Test',
        embedding: oldEmbedding
      });

      await knowledgeGraph.updateNode('update3', { embedding: newEmbedding });
      const retrieved = await knowledgeGraph.getNode('update3');

      expect(retrieved?.embedding?.[0]).toBeCloseTo(0.9);
    });

    it('should throw error when updating non-existent node', async () => {
      await expect(
        knowledgeGraph.updateNode('nonexistent', { content: 'test' })
      ).rejects.toThrow('not found');
    });
  });

  describe('Node Operations - Delete', () => {
    it('should delete an existing node', async () => {
      await knowledgeGraph.addNode({ id: 'delete1', content: 'To delete' });

      await knowledgeGraph.deleteNode('delete1');
      const retrieved = await knowledgeGraph.getNode('delete1');

      expect(retrieved).toBeUndefined();
    });

    it('should delete all edges connected to deleted node', async () => {
      await knowledgeGraph.addNode({ id: 'node-a', content: 'Node A' });
      await knowledgeGraph.addNode({ id: 'node-b', content: 'Node B' });
      await knowledgeGraph.addEdge({
        id: 'edge-ab',
        source: 'node-a',
        target: 'node-b',
        type: 'connects'
      });

      await knowledgeGraph.deleteNode('node-a');

      const edge = await knowledgeGraph.getEdge('edge-ab');
      expect(edge).toBeUndefined();
    });

    it('should throw error when deleting non-existent node', async () => {
      await expect(
        knowledgeGraph.deleteNode('nonexistent')
      ).rejects.toThrow('not found');
    });
  });

  describe('Node Operations - Get and Query', () => {
    it('should retrieve node by ID', async () => {
      await knowledgeGraph.addNode({ id: 'get1', content: 'Test' });
      const node = await knowledgeGraph.getNode('get1');

      expect(node).toBeDefined();
      expect(node?.id).toBe('get1');
    });

    it('should return undefined for non-existent node', async () => {
      const node = await knowledgeGraph.getNode('nonexistent');
      expect(node).toBeUndefined();
    });

    it('should query nodes by type', async () => {
      await knowledgeGraph.addNode({ id: 'type1', content: 'A', type: 'typeA' });
      await knowledgeGraph.addNode({ id: 'type2', content: 'B', type: 'typeB' });
      await knowledgeGraph.addNode({ id: 'type3', content: 'C', type: 'typeA' });

      const nodes = await knowledgeGraph.queryNodes({ type: 'typeA' });

      expect(nodes).toHaveLength(2);
      expect(nodes.map(n => n.id)).toContain('type1');
      expect(nodes.map(n => n.id)).toContain('type3');
    });

    it('should query nodes by metadata', async () => {
      await knowledgeGraph.addNode({
        id: 'meta1',
        content: 'A',
        metadata: { category: 'science' }
      });
      await knowledgeGraph.addNode({
        id: 'meta2',
        content: 'B',
        metadata: { category: 'art' }
      });

      const nodes = await knowledgeGraph.queryNodes({
        metadata: { category: 'science' }
      });

      expect(nodes).toHaveLength(1);
      expect(nodes[0].id).toBe('meta1');
    });

    it('should get all nodes', async () => {
      await knowledgeGraph.addNode({ id: 'all1', content: 'A' });
      await knowledgeGraph.addNode({ id: 'all2', content: 'B' });
      await knowledgeGraph.addNode({ id: 'all3', content: 'C' });

      const nodes = await knowledgeGraph.getAllNodes();

      expect(nodes.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Edge Operations - Add', () => {
    beforeEach(async () => {
      await knowledgeGraph.addNode({ id: 'src1', content: 'Source' });
      await knowledgeGraph.addNode({ id: 'tgt1', content: 'Target' });
    });

    it('should add an edge between nodes', async () => {
      const edge: GraphEdge = {
        id: 'edge1',
        source: 'src1',
        target: 'tgt1',
        type: 'connects'
      };

      await knowledgeGraph.addEdge(edge);
      const retrieved = await knowledgeGraph.getEdge('edge1');

      expect(retrieved).toBeDefined();
      expect(retrieved?.source).toBe('src1');
      expect(retrieved?.target).toBe('tgt1');
    });

    it('should add an edge with weight', async () => {
      const edge: GraphEdge = {
        id: 'edge2',
        source: 'src1',
        target: 'tgt1',
        type: 'weighted',
        weight: 0.75
      };

      await knowledgeGraph.addEdge(edge);
      const retrieved = await knowledgeGraph.getEdge('edge2');

      expect(retrieved?.weight).toBe(0.75);
    });

    it('should add an edge with metadata', async () => {
      const edge: GraphEdge = {
        id: 'edge3',
        source: 'src1',
        target: 'tgt1',
        type: 'documented',
        metadata: { description: 'Test edge' }
      };

      await knowledgeGraph.addEdge(edge);
      const retrieved = await knowledgeGraph.getEdge('edge3');

      expect(retrieved?.metadata?.description).toBe('Test edge');
    });

    it('should reject edge with non-existent source', async () => {
      const edge: GraphEdge = {
        id: 'bad-edge1',
        source: 'nonexistent',
        target: 'tgt1',
        type: 'invalid'
      };

      await expect(knowledgeGraph.addEdge(edge)).rejects.toThrow('source node');
    });

    it('should reject edge with non-existent target', async () => {
      const edge: GraphEdge = {
        id: 'bad-edge2',
        source: 'src1',
        target: 'nonexistent',
        type: 'invalid'
      };

      await expect(knowledgeGraph.addEdge(edge)).rejects.toThrow('target node');
    });

    it('should validate required edge fields', async () => {
      const invalidEdge = {
        source: 'src1',
        target: 'tgt1'
      } as GraphEdge;

      await expect(knowledgeGraph.addEdge(invalidEdge)).rejects.toThrow('id is required');
    });
  });

  describe('Edge Operations - Update', () => {
    beforeEach(async () => {
      await knowledgeGraph.addNode({ id: 'src2', content: 'Source' });
      await knowledgeGraph.addNode({ id: 'tgt2', content: 'Target' });
      await knowledgeGraph.addEdge({
        id: 'update-edge1',
        source: 'src2',
        target: 'tgt2',
        type: 'original',
        weight: 0.5
      });
    });

    it('should update edge type', async () => {
      await knowledgeGraph.updateEdge('update-edge1', { type: 'updated' });
      const edge = await knowledgeGraph.getEdge('update-edge1');

      expect(edge?.type).toBe('updated');
    });

    it('should update edge weight', async () => {
      await knowledgeGraph.updateEdge('update-edge1', { weight: 0.9 });
      const edge = await knowledgeGraph.getEdge('update-edge1');

      expect(edge?.weight).toBe(0.9);
    });

    it('should update edge metadata', async () => {
      await knowledgeGraph.updateEdge('update-edge1', {
        metadata: { updated: true }
      });
      const edge = await knowledgeGraph.getEdge('update-edge1');

      expect(edge?.metadata?.updated).toBe(true);
    });
  });

  describe('Edge Operations - Delete', () => {
    beforeEach(async () => {
      await knowledgeGraph.addNode({ id: 'src3', content: 'Source' });
      await knowledgeGraph.addNode({ id: 'tgt3', content: 'Target' });
      await knowledgeGraph.addEdge({
        id: 'delete-edge1',
        source: 'src3',
        target: 'tgt3',
        type: 'temp'
      });
    });

    it('should delete an edge', async () => {
      await knowledgeGraph.deleteEdge('delete-edge1');
      const edge = await knowledgeGraph.getEdge('delete-edge1');

      expect(edge).toBeUndefined();
    });

    it('should not affect nodes when deleting edge', async () => {
      await knowledgeGraph.deleteEdge('delete-edge1');

      const src = await knowledgeGraph.getNode('src3');
      const tgt = await knowledgeGraph.getNode('tgt3');

      expect(src).toBeDefined();
      expect(tgt).toBeDefined();
    });
  });

  describe('Edge Operations - Query', () => {
    beforeEach(async () => {
      await knowledgeGraph.addNode({ id: 'a', content: 'A' });
      await knowledgeGraph.addNode({ id: 'b', content: 'B' });
      await knowledgeGraph.addNode({ id: 'c', content: 'C' });

      await knowledgeGraph.addEdge({
        id: 'ab',
        source: 'a',
        target: 'b',
        type: 'connects'
      });
      await knowledgeGraph.addEdge({
        id: 'bc',
        source: 'b',
        target: 'c',
        type: 'connects'
      });
      await knowledgeGraph.addEdge({
        id: 'ac',
        source: 'a',
        target: 'c',
        type: 'skips'
      });
    });

    it('should get all edges from a node', async () => {
      const edges = await knowledgeGraph.getEdgesFromNode('a');

      expect(edges).toHaveLength(2);
      expect(edges.map(e => e.id)).toContain('ab');
      expect(edges.map(e => e.id)).toContain('ac');
    });

    it('should get all edges to a node', async () => {
      const edges = await knowledgeGraph.getEdgesToNode('c');

      expect(edges).toHaveLength(2);
      expect(edges.map(e => e.id)).toContain('bc');
      expect(edges.map(e => e.id)).toContain('ac');
    });

    it('should get edges by type', async () => {
      const edges = await knowledgeGraph.queryEdges({ type: 'connects' });

      expect(edges).toHaveLength(2);
      expect(edges.map(e => e.id)).toContain('ab');
      expect(edges.map(e => e.id)).toContain('bc');
    });
  });

  describe('Neighbor Operations', () => {
    beforeEach(async () => {
      // Create a simple graph: A -> B -> C
      //                        A -> D
      await knowledgeGraph.addNode({ id: 'A', content: 'Node A' });
      await knowledgeGraph.addNode({ id: 'B', content: 'Node B' });
      await knowledgeGraph.addNode({ id: 'C', content: 'Node C' });
      await knowledgeGraph.addNode({ id: 'D', content: 'Node D' });

      await knowledgeGraph.addEdge({ id: 'ab', source: 'A', target: 'B', type: 'next' });
      await knowledgeGraph.addEdge({ id: 'bc', source: 'B', target: 'C', type: 'next' });
      await knowledgeGraph.addEdge({ id: 'ad', source: 'A', target: 'D', type: 'branch' });
    });

    it('should get outgoing neighbors', async () => {
      const neighbors = await knowledgeGraph.getNeighbors('A', 'outgoing');

      expect(neighbors).toHaveLength(2);
      expect(neighbors.map(n => n.id)).toContain('B');
      expect(neighbors.map(n => n.id)).toContain('D');
    });

    it('should get incoming neighbors', async () => {
      const neighbors = await knowledgeGraph.getNeighbors('C', 'incoming');

      expect(neighbors).toHaveLength(1);
      expect(neighbors[0].id).toBe('B');
    });

    it('should get both incoming and outgoing neighbors', async () => {
      const neighbors = await knowledgeGraph.getNeighbors('B', 'both');

      expect(neighbors).toHaveLength(2);
      expect(neighbors.map(n => n.id)).toContain('A');
      expect(neighbors.map(n => n.id)).toContain('C');
    });
  });

  describe('Graph Traversal - BFS', () => {
    beforeEach(async () => {
      // Create graph:     A
      //                 /   \
      //                B     C
      //               / \     \
      //              D   E     F
      await knowledgeGraph.addNode({ id: 'A', content: 'Root' });
      await knowledgeGraph.addNode({ id: 'B', content: 'Level 1a' });
      await knowledgeGraph.addNode({ id: 'C', content: 'Level 1b' });
      await knowledgeGraph.addNode({ id: 'D', content: 'Level 2a' });
      await knowledgeGraph.addNode({ id: 'E', content: 'Level 2b' });
      await knowledgeGraph.addNode({ id: 'F', content: 'Level 2c' });

      await knowledgeGraph.addEdge({ id: 'ab', source: 'A', target: 'B', type: 'child' });
      await knowledgeGraph.addEdge({ id: 'ac', source: 'A', target: 'C', type: 'child' });
      await knowledgeGraph.addEdge({ id: 'bd', source: 'B', target: 'D', type: 'child' });
      await knowledgeGraph.addEdge({ id: 'be', source: 'B', target: 'E', type: 'child' });
      await knowledgeGraph.addEdge({ id: 'cf', source: 'C', target: 'F', type: 'child' });
    });

    it('should traverse graph using BFS', async () => {
      const result = await knowledgeGraph.bfs('A');

      expect(result).toHaveLength(6);
      expect(result[0].id).toBe('A');
      // B and C should come before D, E, F
      const bIndex = result.findIndex(n => n.id === 'B');
      const cIndex = result.findIndex(n => n.id === 'C');
      const dIndex = result.findIndex(n => n.id === 'D');

      expect(bIndex).toBeLessThan(dIndex);
      expect(cIndex).toBeLessThan(dIndex);
    });

    it('should respect maxDepth in BFS', async () => {
      const result = await knowledgeGraph.bfs('A', { maxDepth: 1 });

      expect(result).toHaveLength(3); // A, B, C only
      expect(result.map(n => n.id)).toContain('A');
      expect(result.map(n => n.id)).toContain('B');
      expect(result.map(n => n.id)).toContain('C');
    });

    it('should apply node filter in BFS', async () => {
      const result = await knowledgeGraph.bfs('A', {
        nodeFilter: (node) => node.content.includes('Level 1')
      });

      // Should include A (starting node) and Level 1 nodes
      expect(result.length).toBeGreaterThanOrEqual(1);
      const hasLevelTwo = result.some(n => n.content.includes('Level 2'));
      expect(hasLevelTwo).toBe(false);
    });

    it('should handle disconnected start node', async () => {
      await knowledgeGraph.addNode({ id: 'isolated', content: 'Alone' });
      const result = await knowledgeGraph.bfs('isolated');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('isolated');
    });
  });

  describe('Graph Traversal - DFS', () => {
    beforeEach(async () => {
      // Same graph as BFS tests
      await knowledgeGraph.addNode({ id: 'A', content: 'Root' });
      await knowledgeGraph.addNode({ id: 'B', content: 'Level 1a' });
      await knowledgeGraph.addNode({ id: 'C', content: 'Level 1b' });
      await knowledgeGraph.addNode({ id: 'D', content: 'Level 2a' });
      await knowledgeGraph.addNode({ id: 'E', content: 'Level 2b' });

      await knowledgeGraph.addEdge({ id: 'ab', source: 'A', target: 'B', type: 'child' });
      await knowledgeGraph.addEdge({ id: 'ac', source: 'A', target: 'C', type: 'child' });
      await knowledgeGraph.addEdge({ id: 'bd', source: 'B', target: 'D', type: 'child' });
      await knowledgeGraph.addEdge({ id: 'be', source: 'B', target: 'E', type: 'child' });
    });

    it('should traverse graph using DFS', async () => {
      const result = await knowledgeGraph.dfs('A');

      expect(result).toHaveLength(5);
      expect(result[0].id).toBe('A');

      // In DFS, if we go A->B first, we should see D or E before C
      const bIndex = result.findIndex(n => n.id === 'B');
      const dIndex = result.findIndex(n => n.id === 'D');
      const cIndex = result.findIndex(n => n.id === 'C');

      if (bIndex < cIndex) {
        expect(dIndex).toBeLessThan(cIndex);
      }
    });

    it('should respect maxDepth in DFS', async () => {
      const result = await knowledgeGraph.dfs('A', { maxDepth: 1 });

      expect(result).toHaveLength(3); // A, B, C only
    });

    it('should apply edge filter in DFS', async () => {
      const result = await knowledgeGraph.dfs('A', {
        edgeFilter: (edge) => edge.target !== 'C'
      });

      // Should not include C since we filter edges to C
      expect(result.map(n => n.id)).not.toContain('C');
    });
  });

  describe('Path Finding', () => {
    beforeEach(async () => {
      // Create graph:  A -> B -> C -> D
      //                |         |
      //                +----E----+
      await knowledgeGraph.addNode({ id: 'A', content: 'Start' });
      await knowledgeGraph.addNode({ id: 'B', content: 'Middle 1' });
      await knowledgeGraph.addNode({ id: 'C', content: 'Middle 2' });
      await knowledgeGraph.addNode({ id: 'D', content: 'End' });
      await knowledgeGraph.addNode({ id: 'E', content: 'Shortcut' });

      await knowledgeGraph.addEdge({ id: 'ab', source: 'A', target: 'B', type: 'path' });
      await knowledgeGraph.addEdge({ id: 'bc', source: 'B', target: 'C', type: 'path' });
      await knowledgeGraph.addEdge({ id: 'cd', source: 'C', target: 'D', type: 'path' });
      await knowledgeGraph.addEdge({ id: 'ae', source: 'A', target: 'E', type: 'shortcut' });
      await knowledgeGraph.addEdge({ id: 'ed', source: 'E', target: 'D', type: 'shortcut' });
    });

    it('should find shortest path between nodes', async () => {
      const path = await knowledgeGraph.findPath('A', 'D');

      expect(path).toBeDefined();
      expect(path.length).toBeGreaterThan(0);
      expect(path[0].id).toBe('A');
      expect(path[path.length - 1].id).toBe('D');
    });

    it('should find shortest path (shortcut)', async () => {
      const path = await knowledgeGraph.findPath('A', 'D');

      // Shortest path should be A -> E -> D (3 nodes)
      expect(path).toHaveLength(3);
      expect(path.map(n => n.id)).toEqual(['A', 'E', 'D']);
    });

    it('should return empty array when no path exists', async () => {
      await knowledgeGraph.addNode({ id: 'isolated', content: 'Isolated' });
      const path = await knowledgeGraph.findPath('A', 'isolated');

      expect(path).toHaveLength(0);
    });

    it('should handle path from node to itself', async () => {
      const path = await knowledgeGraph.findPath('A', 'A');

      expect(path).toHaveLength(1);
      expect(path[0].id).toBe('A');
    });
  });

  describe('Vector Similarity Search', () => {
    beforeEach(async () => {
      const createEmbedding = (seed: number): number[] => {
        return Array.from({ length: 384 }, (_, i) => Math.sin(seed + i) * 0.5);
      };

      await knowledgeGraph.addNode({
        id: 'vec1',
        content: 'Similar to seed 1',
        embedding: createEmbedding(1)
      });

      await knowledgeGraph.addNode({
        id: 'vec2',
        content: 'Similar to seed 1.1',
        embedding: createEmbedding(1.1)
      });

      await knowledgeGraph.addNode({
        id: 'vec3',
        content: 'Very different',
        embedding: createEmbedding(100)
      });
    });

    it('should find similar nodes by embedding', async () => {
      const queryEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(1.05 + i) * 0.5);

      const results = await knowledgeGraph.findSimilarNodes(queryEmbedding, 2);

      expect(results).toHaveLength(2);
      // Should return vec1 and vec2 as most similar
      expect(results.map(n => n.id)).toContain('vec1');
      expect(results.map(n => n.id)).toContain('vec2');
    });

    it('should return nodes in order of similarity', async () => {
      const queryEmbedding = Array.from({ length: 384 }, (_, i) => Math.sin(1 + i) * 0.5);

      const results = await knowledgeGraph.findSimilarNodes(queryEmbedding, 3);

      expect(results[0].id).toBe('vec1'); // Exact match should be first
    });

    it('should handle topK larger than available nodes', async () => {
      const queryEmbedding = Array.from({ length: 384 }, () => 0.5);

      const results = await knowledgeGraph.findSimilarNodes(queryEmbedding, 100);

      expect(results.length).toBeLessThanOrEqual(3);
    });

    it('should reject queries without embeddings enabled', async () => {
      await knowledgeGraph.addNode({ id: 'no-embedding', content: 'No vector' });

      const queryEmbedding = Array.from({ length: 384 }, () => 0.5);

      // Should not return nodes without embeddings
      const results = await knowledgeGraph.findSimilarNodes(queryEmbedding, 10);
      expect(results.map(n => n.id)).not.toContain('no-embedding');
    });
  });

  describe('Concurrent Operations', () => {
    it('should handle concurrent node additions', async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        knowledgeGraph.addNode({
          id: `concurrent-${i}`,
          content: `Node ${i}`
        })
      );

      await Promise.all(promises);

      const nodes = await knowledgeGraph.getAllNodes();
      expect(nodes.length).toBeGreaterThanOrEqual(10);
    });

    it('should handle concurrent edge additions', async () => {
      // First add nodes
      for (let i = 0; i < 5; i++) {
        await knowledgeGraph.addNode({ id: `n${i}`, content: `Node ${i}` });
      }

      // Then add edges concurrently
      const promises = Array.from({ length: 4 }, (_, i) =>
        knowledgeGraph.addEdge({
          id: `e${i}`,
          source: `n${i}`,
          target: `n${i + 1}`,
          type: 'concurrent'
        })
      );

      await Promise.all(promises);

      const edges = await knowledgeGraph.queryEdges({ type: 'concurrent' });
      expect(edges).toHaveLength(4);
    });

    it('should handle concurrent reads and writes', async () => {
      await knowledgeGraph.addNode({ id: 'rw-test', content: 'Test' });

      const reads = Array.from({ length: 5 }, () =>
        knowledgeGraph.getNode('rw-test')
      );

      const writes = Array.from({ length: 5 }, (_, i) =>
        knowledgeGraph.updateNode('rw-test', { content: `Update ${i}` })
      );

      await Promise.all([...reads, ...writes]);

      const finalNode = await knowledgeGraph.getNode('rw-test');
      expect(finalNode).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful error for invalid embedding dimension', async () => {
      try {
        await knowledgeGraph.addNode({
          id: 'bad-dim',
          content: 'Test',
          embedding: [1, 2, 3]
        });
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('embedding');
        expect(error.message).toContain('dimension');
      }
    });

    it('should provide meaningful error for missing required fields', async () => {
      try {
        await knowledgeGraph.addNode({ content: 'No ID' } as GraphNode);
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toContain('id');
        expect(error.message).toContain('required');
      }
    });

    it('should handle database connection errors gracefully', async () => {
      const badGraph = new KnowledgeGraph('/invalid/path/that/does/not/exist');

      await expect(badGraph.initialize()).rejects.toThrow();
    });
  });

  describe('Schema Validation', () => {
    it('should validate node schema on add', async () => {
      const invalidNode = {
        id: 123, // Should be string
        content: 'Test'
      } as any;

      await expect(knowledgeGraph.addNode(invalidNode)).rejects.toThrow();
    });

    it('should validate edge schema on add', async () => {
      await knowledgeGraph.addNode({ id: 'src', content: 'Source' });
      await knowledgeGraph.addNode({ id: 'tgt', content: 'Target' });

      const invalidEdge = {
        id: 'edge',
        source: 'src',
        target: 'tgt',
        type: 123 // Should be string
      } as any;

      await expect(knowledgeGraph.addEdge(invalidEdge)).rejects.toThrow();
    });

    it('should validate metadata types', async () => {
      // Metadata should be a plain object
      const node: GraphNode = {
        id: 'meta-test',
        content: 'Test',
        metadata: 'invalid' as any
      };

      await expect(knowledgeGraph.addNode(node)).rejects.toThrow('metadata');
    });
  });

  describe('Graph Statistics', () => {
    it('should count total nodes', async () => {
      await knowledgeGraph.addNode({ id: 'stat1', content: 'A' });
      await knowledgeGraph.addNode({ id: 'stat2', content: 'B' });

      const count = await knowledgeGraph.getNodeCount();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    it('should count total edges', async () => {
      await knowledgeGraph.addNode({ id: 's1', content: 'A' });
      await knowledgeGraph.addNode({ id: 't1', content: 'B' });
      await knowledgeGraph.addEdge({ id: 'e1', source: 's1', target: 't1', type: 'test' });

      const count = await knowledgeGraph.getEdgeCount();
      expect(count).toBeGreaterThanOrEqual(1);
    });

    it('should get node degree', async () => {
      await knowledgeGraph.addNode({ id: 'hub', content: 'Hub' });
      await knowledgeGraph.addNode({ id: 'spoke1', content: 'Spoke 1' });
      await knowledgeGraph.addNode({ id: 'spoke2', content: 'Spoke 2' });

      await knowledgeGraph.addEdge({ id: 'h1', source: 'hub', target: 'spoke1', type: 'connects' });
      await knowledgeGraph.addEdge({ id: 'h2', source: 'hub', target: 'spoke2', type: 'connects' });

      const degree = await knowledgeGraph.getNodeDegree('hub');
      expect(degree).toBe(2);
    });
  });
});
