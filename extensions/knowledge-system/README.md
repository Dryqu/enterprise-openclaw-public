# Knowledge Graph System

A production-ready knowledge graph implementation with vector search capabilities using LanceDB.

## Features

- **Graph Operations**: Full CRUD operations for nodes and edges
- **Vector Embeddings**: Store and search nodes using semantic embeddings (384-dimension vectors)
- **Graph Traversal**: BFS, DFS, and shortest path algorithms
- **Flexible Queries**: Query nodes by type, metadata, or vector similarity
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **High Performance**: Built on LanceDB for efficient vector storage and retrieval

## Installation

The knowledge system is part of the enterprise-openclaw project and uses LanceDB for vector storage:

```bash
npm install @lancedb/lancedb
```

## Architecture

### Components

1. **KnowledgeGraph** (`knowledge-graph.ts`): Main graph management interface
2. **VectorStore** (`vector-store.ts`): LanceDB integration for storage
3. **Types** (`types.ts`): TypeScript interfaces and type definitions

### Data Schema

#### GraphNode
```typescript
interface GraphNode {
  id: string;              // Unique identifier
  content: string;         // Node content/text
  embedding?: number[];    // Optional 384-dim vector
  metadata?: Record<string, any>;  // Custom properties
  type?: string;           // Node category
}
```

#### GraphEdge
```typescript
interface GraphEdge {
  id: string;              // Unique identifier
  source: string;          // Source node ID
  target: string;          // Target node ID
  type: string;            // Relationship type
  weight?: number;         // Optional edge weight
  metadata?: Record<string, any>;  // Custom properties
}
```

## Usage

### Basic Setup

```typescript
import { KnowledgeGraph } from './extensions/knowledge-system/knowledge-graph.js';

// Initialize the knowledge graph
const graph = new KnowledgeGraph('./data/my-knowledge-graph');
await graph.initialize();
```

### Adding Nodes

```typescript
// Add a simple node
await graph.addNode({
  id: 'node1',
  content: 'This is my first node',
  type: 'document'
});

// Add a node with embedding
await graph.addNode({
  id: 'node2',
  content: 'Node with semantic vector',
  embedding: generateEmbedding('Node with semantic vector'),
  metadata: {
    author: 'Alice',
    timestamp: Date.now()
  }
});
```

### Adding Edges

```typescript
// Connect nodes with an edge
await graph.addEdge({
  id: 'edge1',
  source: 'node1',
  target: 'node2',
  type: 'related_to',
  weight: 0.85
});
```

### Querying

```typescript
// Get a specific node
const node = await graph.getNode('node1');

// Query nodes by type
const documents = await graph.queryNodes({ type: 'document' });

// Query nodes by metadata
const aliceNodes = await graph.queryNodes({
  metadata: { author: 'Alice' }
});

// Get all nodes
const allNodes = await graph.getAllNodes();
```

### Graph Traversal

#### Breadth-First Search (BFS)
```typescript
// Traverse from a starting node
const nodes = await graph.bfs('node1');

// With options
const limitedTraversal = await graph.bfs('node1', {
  maxDepth: 2,
  nodeFilter: (node) => node.type === 'document',
  edgeFilter: (edge) => edge.weight > 0.5
});
```

#### Depth-First Search (DFS)
```typescript
// Deep traversal
const nodes = await graph.dfs('node1');

// With max depth
const limitedDFS = await graph.dfs('node1', {
  maxDepth: 3
});
```

#### Path Finding
```typescript
// Find shortest path between two nodes
const path = await graph.findPath('node1', 'node5');
console.log('Path:', path.map(n => n.id).join(' -> '));
```

### Vector Similarity Search

```typescript
// Find similar nodes using embeddings
const queryEmbedding = generateEmbedding('search query');
const similarNodes = await graph.findSimilarNodes(queryEmbedding, 5);

// Results are ordered by similarity
similarNodes.forEach((node, i) => {
  console.log(`${i + 1}. ${node.content}`);
});
```

### Neighbor Operations

```typescript
// Get outgoing neighbors
const outgoing = await graph.getNeighbors('node1', 'outgoing');

// Get incoming neighbors
const incoming = await graph.getNeighbors('node1', 'incoming');

// Get all connected neighbors
const all = await graph.getNeighbors('node1', 'both');
```

### Update and Delete

```typescript
// Update a node
await graph.updateNode('node1', {
  content: 'Updated content',
  metadata: { updated: true }
});

// Update an edge
await graph.updateEdge('edge1', {
  weight: 0.95
});

// Delete a node (also deletes connected edges)
await graph.deleteNode('node1');

// Delete an edge
await graph.deleteEdge('edge1');
```

## Graph Traversal Algorithms

### Breadth-First Search (BFS)
- Explores nodes level by level
- Finds shortest paths in unweighted graphs
- Useful for finding nearby nodes

### Depth-First Search (DFS)
- Explores as far as possible along each branch
- Memory efficient for deep graphs
- Useful for detecting cycles and dependencies

### Shortest Path (BFS-based)
- Finds the shortest path between two nodes
- Returns the sequence of nodes in the path
- Returns empty array if no path exists

## Vector Embeddings

The knowledge graph supports 384-dimensional embeddings for semantic search:

```typescript
// Mock embedding generator (replace with actual model)
function mockEmbedding(text: string): number[] {
  const hash = text.split('').reduce((acc, char) =>
    acc + char.charCodeAt(0), 0);
  return Array.from({ length: 384 }, (_, i) =>
    Math.sin(hash + i) * 0.5);
}

// Add nodes with embeddings
await graph.addNode({
  id: 'semantic-node',
  content: 'Knowledge graphs enable semantic search',
  embedding: mockEmbedding('Knowledge graphs enable semantic search')
});

// Search by similarity
const query = mockEmbedding('semantic search capabilities');
const results = await graph.findSimilarNodes(query, 10);
```

## Statistics

```typescript
// Get graph statistics
const nodeCount = await graph.getNodeCount();
const edgeCount = await graph.getEdgeCount();
const degree = await graph.getNodeDegree('node1');

console.log(`Graph has ${nodeCount} nodes and ${edgeCount} edges`);
console.log(`Node 'node1' has degree ${degree}`);
```

## Error Handling

The knowledge graph provides meaningful error messages:

```typescript
try {
  await graph.addNode({
    id: 'bad-node',
    content: 'Test',
    embedding: [1, 2, 3] // Wrong dimension
  });
} catch (error) {
  console.error(error.message);
  // "Invalid embedding dimension. Expected 384, got 3"
}
```

## Performance Considerations

- **Batch Operations**: Add multiple nodes/edges when possible
- **Embeddings**: Only add embeddings when semantic search is needed
- **Traversal Depth**: Use `maxDepth` to limit deep traversals
- **Filters**: Apply filters early to reduce processing

## Testing

The knowledge system has comprehensive test coverage (90%+):

```bash
npm test -- tests/knowledge-system/knowledge-graph.test.ts
```

Test categories:
- Database initialization
- Node CRUD operations
- Edge CRUD operations
- Graph traversal algorithms
- Vector similarity search
- Concurrent operations
- Error handling
- Schema validation

## Cleanup

Always close the graph when done:

```typescript
await graph.close();
```

## Integration Example

```typescript
import { KnowledgeGraph } from './extensions/knowledge-system/knowledge-graph.js';

async function main() {
  // Initialize
  const graph = new KnowledgeGraph('./data/knowledge-graph');
  await graph.initialize();

  // Build a simple knowledge graph
  await graph.addNode({
    id: 'ai',
    content: 'Artificial Intelligence'
  });
  await graph.addNode({
    id: 'ml',
    content: 'Machine Learning'
  });
  await graph.addNode({
    id: 'dl',
    content: 'Deep Learning'
  });

  await graph.addEdge({
    id: 'ai-ml',
    source: 'ai',
    target: 'ml',
    type: 'includes'
  });
  await graph.addEdge({
    id: 'ml-dl',
    source: 'ml',
    target: 'dl',
    type: 'includes'
  });

  // Traverse the graph
  const nodes = await graph.bfs('ai');
  console.log('AI hierarchy:', nodes.map(n => n.content));

  // Find path
  const path = await graph.findPath('ai', 'dl');
  console.log('Path from AI to DL:', path.map(n => n.content).join(' -> '));

  // Cleanup
  await graph.close();
}

main().catch(console.error);
```

## License

Apache-2.0
