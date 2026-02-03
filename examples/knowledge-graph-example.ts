/**
 * Knowledge Graph Example
 *
 * Demonstrates the usage of the Knowledge Graph system with:
 * - Graph construction
 * - Node and edge operations
 * - Graph traversal algorithms (BFS, DFS)
 * - Vector similarity search
 * - Path finding
 */

import { KnowledgeGraph } from '../extensions/knowledge-system/knowledge-graph.js';
import { GraphNode } from '../extensions/knowledge-system/types.js';

/**
 * Mock embedding generator for demonstration
 * In production, replace with actual embedding model (e.g., OpenAI, Sentence Transformers)
 */
function mockEmbedding(text: string): number[] {
  const hash = text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  return Array.from({ length: 384 }, (_, i) => Math.sin(hash + i) * 0.5);
}

/**
 * Example 1: Building a Technology Knowledge Graph
 */
async function example1_buildTechGraph() {
  console.log('\n=== Example 1: Technology Knowledge Graph ===\n');

  const graph = new KnowledgeGraph('./data/examples/tech-graph');
  await graph.initialize();

  // Add technology nodes
  const technologies = [
    { id: 'ai', name: 'Artificial Intelligence', description: 'Computer systems that mimic human intelligence' },
    { id: 'ml', name: 'Machine Learning', description: 'Algorithms that learn from data' },
    { id: 'dl', name: 'Deep Learning', description: 'Neural networks with multiple layers' },
    { id: 'nlp', name: 'Natural Language Processing', description: 'Understanding and processing human language' },
    { id: 'cv', name: 'Computer Vision', description: 'Enabling computers to understand images' },
    { id: 'rl', name: 'Reinforcement Learning', description: 'Learning through rewards and penalties' }
  ];

  for (const tech of technologies) {
    await graph.addNode({
      id: tech.id,
      content: `${tech.name}: ${tech.description}`,
      type: 'technology',
      metadata: {
        name: tech.name,
        description: tech.description,
        created: Date.now()
      }
    });
  }

  // Add relationships
  const relationships = [
    { from: 'ai', to: 'ml', type: 'includes', weight: 0.9 },
    { from: 'ai', to: 'nlp', type: 'includes', weight: 0.8 },
    { from: 'ai', to: 'cv', type: 'includes', weight: 0.8 },
    { from: 'ml', to: 'dl', type: 'includes', weight: 0.95 },
    { from: 'ml', to: 'rl', type: 'includes', weight: 0.85 },
    { from: 'dl', to: 'nlp', type: 'enables', weight: 0.9 },
    { from: 'dl', to: 'cv', type: 'enables', weight: 0.95 }
  ];

  for (const rel of relationships) {
    await graph.addEdge({
      id: `${rel.from}-${rel.to}`,
      source: rel.from,
      target: rel.to,
      type: rel.type,
      weight: rel.weight
    });
  }

  console.log(`✓ Created graph with ${technologies.length} nodes and ${relationships.length} edges`);

  // BFS Traversal
  console.log('\nBreadth-First Search from AI:');
  const bfsNodes = await graph.bfs('ai');
  bfsNodes.forEach((node, i) => {
    const name = node.metadata?.name || node.id;
    console.log(`  ${i + 1}. ${name}`);
  });

  // DFS Traversal
  console.log('\nDepth-First Search from AI:');
  const dfsNodes = await graph.dfs('ai');
  dfsNodes.forEach((node, i) => {
    const name = node.metadata?.name || node.id;
    console.log(`  ${i + 1}. ${name}`);
  });

  // Find shortest path
  console.log('\nShortest path from AI to NLP:');
  const path = await graph.findPath('ai', 'nlp');
  const pathStr = path.map(n => n.metadata?.name || n.id).join(' → ');
  console.log(`  ${pathStr}`);

  // Get neighbors
  console.log('\nMachine Learning connections:');
  const mlNeighbors = await graph.getNeighbors('ml', 'outgoing');
  mlNeighbors.forEach(n => {
    console.log(`  - ${n.metadata?.name}: ${n.metadata?.description}`);
  });

  await graph.close();
  console.log('\n✓ Example 1 completed\n');
}

/**
 * Example 2: Document Knowledge Base with Vector Search
 */
async function example2_documentKnowledgeBase() {
  console.log('\n=== Example 2: Document Knowledge Base ===\n');

  const graph = new KnowledgeGraph('./data/examples/docs-graph');
  await graph.initialize();

  // Add documents with embeddings
  const documents = [
    {
      id: 'doc1',
      title: 'Introduction to Machine Learning',
      content: 'Machine learning is a subset of artificial intelligence that enables computers to learn from data without explicit programming.',
      category: 'education'
    },
    {
      id: 'doc2',
      title: 'Deep Learning Fundamentals',
      content: 'Deep learning uses neural networks with multiple layers to model complex patterns in data, achieving state-of-the-art results.',
      category: 'education'
    },
    {
      id: 'doc3',
      title: 'Natural Language Processing Applications',
      content: 'NLP enables computers to understand, interpret, and generate human language for tasks like translation and sentiment analysis.',
      category: 'applications'
    },
    {
      id: 'doc4',
      title: 'Computer Vision in Robotics',
      content: 'Computer vision allows robots to perceive and understand their environment through image processing and pattern recognition.',
      category: 'applications'
    },
    {
      id: 'doc5',
      title: 'Reinforcement Learning in Games',
      content: 'Reinforcement learning agents learn optimal strategies through trial and error, mastering complex games like Chess and Go.',
      category: 'applications'
    }
  ];

  for (const doc of documents) {
    await graph.addNode({
      id: doc.id,
      content: doc.content,
      embedding: mockEmbedding(doc.content),
      type: 'document',
      metadata: {
        title: doc.title,
        category: doc.category,
        wordCount: doc.content.split(' ').length
      }
    });
  }

  console.log(`✓ Added ${documents.length} documents with embeddings`);

  // Query by category
  console.log('\nEducation documents:');
  const eduDocs = await graph.queryNodes({
    type: 'document',
    metadata: { category: 'education' }
  });
  eduDocs.forEach(doc => {
    console.log(`  - ${doc.metadata?.title}`);
  });

  // Semantic search
  const queries = [
    'neural networks and deep learning',
    'language understanding and translation',
    'robot vision systems'
  ];

  for (const query of queries) {
    console.log(`\nSearch: "${query}"`);
    const queryEmbed = mockEmbedding(query);
    const results = await graph.findSimilarNodes(queryEmbed, 2);

    results.forEach((doc, i) => {
      console.log(`  ${i + 1}. ${doc.metadata?.title}`);
      console.log(`     ${doc.content.substring(0, 80)}...`);
    });
  }

  await graph.close();
  console.log('\n✓ Example 2 completed\n');
}

/**
 * Example 3: Organizational Knowledge Graph
 */
async function example3_organizationalGraph() {
  console.log('\n=== Example 3: Organizational Knowledge Graph ===\n');

  const graph = new KnowledgeGraph('./data/examples/org-graph');
  await graph.initialize();

  // Add people
  const people = [
    { id: 'alice', name: 'Alice Chen', role: 'CTO', department: 'Engineering' },
    { id: 'bob', name: 'Bob Smith', role: 'ML Engineer', department: 'Engineering' },
    { id: 'carol', name: 'Carol Johnson', role: 'Data Scientist', department: 'Engineering' },
    { id: 'david', name: 'David Lee', role: 'Product Manager', department: 'Product' },
    { id: 'eve', name: 'Eve Martinez', role: 'Designer', department: 'Design' }
  ];

  for (const person of people) {
    await graph.addNode({
      id: person.id,
      content: `${person.name} - ${person.role}`,
      type: 'person',
      metadata: person
    });
  }

  // Add projects
  const projects = [
    { id: 'proj-ml', name: 'ML Platform', status: 'active' },
    { id: 'proj-nlp', name: 'NLP Service', status: 'planning' },
    { id: 'proj-api', name: 'API Gateway', status: 'active' }
  ];

  for (const project of projects) {
    await graph.addNode({
      id: project.id,
      content: project.name,
      type: 'project',
      metadata: project
    });
  }

  // Add relationships
  const relationships = [
    { from: 'alice', to: 'bob', type: 'manages' },
    { from: 'alice', to: 'carol', type: 'manages' },
    { from: 'bob', to: 'proj-ml', type: 'works_on' },
    { from: 'carol', to: 'proj-ml', type: 'works_on' },
    { from: 'carol', to: 'proj-nlp', type: 'works_on' },
    { from: 'david', to: 'proj-ml', type: 'owns' },
    { from: 'david', to: 'proj-nlp', type: 'owns' },
    { from: 'bob', to: 'carol', type: 'collaborates_with' },
    { from: 'david', to: 'eve', type: 'collaborates_with' }
  ];

  for (const rel of relationships) {
    await graph.addEdge({
      id: `${rel.from}-${rel.to}`,
      source: rel.from,
      target: rel.to,
      type: rel.type
    });
  }

  console.log('✓ Created organizational graph');

  // Find Alice's team
  console.log('\nAlice\'s Direct Reports:');
  const reports = await graph.getNeighbors('alice', 'outgoing');
  const directReports = reports.filter(n => n.type === 'person');
  directReports.forEach(person => {
    console.log(`  - ${person.metadata?.name} (${person.metadata?.role})`);
  });

  // Find all people working on ML Platform
  console.log('\nML Platform Team:');
  const mlTeam = await graph.getNeighbors('proj-ml', 'incoming');
  const workers = mlTeam.filter(n => n.type === 'person');
  workers.forEach(person => {
    console.log(`  - ${person.metadata?.name}`);
  });

  // Find Carol's projects
  console.log('\nCarol\'s Projects:');
  const carolProjects = await graph.getNeighbors('carol', 'outgoing');
  const carolProjs = carolProjects.filter(n => n.type === 'project');
  carolProjs.forEach(proj => {
    console.log(`  - ${proj.metadata?.name} (${proj.metadata?.status})`);
  });

  // Graph statistics
  const nodeCount = await graph.getNodeCount();
  const edgeCount = await graph.getEdgeCount();
  console.log(`\nGraph Statistics:`);
  console.log(`  Nodes: ${nodeCount}`);
  console.log(`  Edges: ${edgeCount}`);
  console.log(`  Alice's degree: ${await graph.getNodeDegree('alice')}`);

  await graph.close();
  console.log('\n✓ Example 3 completed\n');
}

/**
 * Example 4: Advanced Traversal with Filters
 */
async function example4_advancedTraversal() {
  console.log('\n=== Example 4: Advanced Traversal ===\n');

  const graph = new KnowledgeGraph('./data/examples/filter-graph');
  await graph.initialize();

  // Build a simple hierarchy: A -> B -> C -> D
  //                          A -> E -> F
  const nodes = ['A', 'B', 'C', 'D', 'E', 'F'];
  for (const id of nodes) {
    await graph.addNode({
      id,
      content: `Node ${id}`,
      type: id === 'A' ? 'root' : id.charCodeAt(0) % 2 === 0 ? 'even' : 'odd'
    });
  }

  const edges = [
    { from: 'A', to: 'B', type: 'child', weight: 0.8 },
    { from: 'B', to: 'C', type: 'child', weight: 0.6 },
    { from: 'C', to: 'D', type: 'child', weight: 0.9 },
    { from: 'A', to: 'E', type: 'child', weight: 0.7 },
    { from: 'E', to: 'F', type: 'child', weight: 0.5 }
  ];

  for (const edge of edges) {
    await graph.addEdge({
      id: `${edge.from}-${edge.to}`,
      source: edge.from,
      target: edge.to,
      type: edge.type,
      weight: edge.weight
    });
  }

  console.log('✓ Created graph');

  // BFS with max depth
  console.log('\nBFS with max depth 2:');
  const limited = await graph.bfs('A', { maxDepth: 2 });
  console.log(`  Found: ${limited.map(n => n.id).join(', ')}`);

  // BFS with node filter
  console.log('\nBFS with node type filter (even):');
  const evenNodes = await graph.bfs('A', {
    nodeFilter: (node) => node.type === 'even'  || node.type === 'root'
  });
  console.log(`  Found: ${evenNodes.map(n => n.id).join(', ')}`);

  // BFS with edge filter
  console.log('\nBFS with edge weight filter (>= 0.7):');
  const highWeight = await graph.bfs('A', {
    edgeFilter: (edge) => (edge.weight || 0) >= 0.7
  });
  console.log(`  Found: ${highWeight.map(n => n.id).join(', ')}`);

  // Combined filters
  console.log('\nBFS with combined filters:');
  const combined = await graph.bfs('A', {
    maxDepth: 2,
    nodeFilter: (node) => node.type !== 'odd' ,
    edgeFilter: (edge) => (edge.weight || 0) >= 0.7
  });
  console.log(`  Found: ${combined.map(n => n.id).join(', ')}`);

  await graph.close();
  console.log('\n✓ Example 4 completed\n');
}

/**
 * Main function - run all examples
 */
async function main() {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║   Knowledge Graph System - Usage Examples     ║');
  console.log('╚════════════════════════════════════════════════╝');

  try {
    await example1_buildTechGraph();
    await example2_documentKnowledgeBase();
    await example3_organizationalGraph();
    await example4_advancedTraversal();

    console.log('╔════════════════════════════════════════════════╗');
    console.log('║   All examples completed successfully!         ║');
    console.log('╚════════════════════════════════════════════════╝\n');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export {
  example1_buildTechGraph,
  example2_documentKnowledgeBase,
  example3_organizationalGraph,
  example4_advancedTraversal
};
