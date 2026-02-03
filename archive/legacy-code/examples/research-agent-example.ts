/**
 * ResearchAgent Integration Example
 * Demonstrates deep research with compression and reranking
 */

import { ResearchAgent } from '../extensions/agent-library/utility-agents/research-agent';
import { DistillerOrchestrator } from '../src/orchestrator/distiller-orchestrator';
import * as path from 'path';

async function main() {
  console.log('=== ResearchAgent Integration Example ===\n');

  // 1. Create ResearchAgent
  console.log('1. Creating ResearchAgent...');
  const researchAgent = new ResearchAgent({
    agentName: 'research',
    agentDescription: 'Deep research agent with compression and reranking',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
    compressionRatio: 0.5,
    topK: 5,
  });
  console.log('   ✓ ResearchAgent created\n');

  // 2. Test basic research
  console.log('2. Performing basic research...');
  const query1 = 'What is machine learning?';
  const result1 = await researchAgent.execute(query1);
  console.log(`   Query: "${query1}"`);
  console.log(`   Result preview: ${result1.substring(0, 150)}...\n`);

  // 3. Test with custom options
  console.log('3. Research with custom options...');
  const query2 = 'Explain deep learning neural networks';
  const result2 = await researchAgent.execute(query2, {
    compressionRatio: 0.3, // Aggressive compression
    rerankStrategy: 'semantic',
    minRelevanceScore: 0.2,
    includeSources: true,
    synthesisStyle: 'detailed',
  });
  console.log(`   Query: "${query2}"`);
  console.log(`   Compressed & reranked result length: ${result2.length} chars\n`);

  // 4. Test structured research
  console.log('4. Getting structured research results...');
  const query3 = 'quantum computing applications';
  const research = await researchAgent.research(query3, {
    maxResults: 5,
    compressionRatio: 0.4,
    rerankStrategy: 'tfidf',
    minRelevanceScore: 0.3,
  });

  console.log(`   Original documents: ${research.originalDocuments?.length || 0}`);
  console.log(`   Compressed documents: ${research.compressedDocuments.length}`);
  console.log(`   Ranked documents: ${research.rankedDocuments.length}`);
  console.log('   Top document scores:');
  research.rankedDocuments.slice(0, 3).forEach((doc, i) => {
    console.log(`     ${i + 1}. Score: ${(doc.score * 100).toFixed(1)}% - ${doc.source || 'Unknown'}`);
  });
  console.log();

  // 5. Test self-reflection
  console.log('5. Testing self-reflection...');
  const query4 = 'artificial intelligence ethics';
  const initialResult = await researchAgent.execute(query4);
  const reflectedResult = await researchAgent.selfReflect(query4, initialResult);

  console.log('   Initial result length:', initialResult.length);
  console.log('   Reflected result length:', reflectedResult.length);
  console.log('   Self-reflection added notes:', reflectedResult !== initialResult);
  console.log();

  // 6. Test compression strategies
  console.log('6. Comparing compression strategies...');
  const testQuery = 'natural language processing techniques';
  const searchResults = await researchAgent.search(testQuery, { maxResults: 3 });

  console.log(`   Found ${searchResults.length} documents`);
  console.log('   Original total length:', searchResults.reduce((sum, doc) => sum + doc.content.length, 0));

  // Test different ratios
  const ratios = [0.8, 0.5, 0.3];
  for (const ratio of ratios) {
    const compressed = await researchAgent.research(testQuery, {
      compressionRatio: ratio,
    });
    const totalCompressed = compressed.compressedDocuments.reduce(
      (sum, doc) => sum + doc.content.length,
      0
    );
    console.log(`   Compression ${(ratio * 100).toFixed(0)}%: ${totalCompressed} chars`);
  }
  console.log();

  // 7. Integration with orchestrator
  console.log('7. Integrating with DistillerOrchestrator...');
  const orchestrator = new DistillerOrchestrator();

  // Load configuration
  const configPath = path.join(__dirname, '../config/examples/test-distiller-config.yaml');
  await orchestrator.loadConfig(configPath);

  // Register ResearchAgent
  orchestrator.registerAgent('research', (query: string, context?: any) =>
    researchAgent.execute(query, context)
  );

  // Test through orchestrator
  const orchestratedResult = await orchestrator.query('Research climate change impacts');
  console.log(`   Orchestrated result length: ${orchestratedResult.length} chars`);
  console.log(`   Contains research content: ${orchestratedResult.includes('Research Results')}`);
  console.log();

  // 8. Performance test
  console.log('8. Performance test (concurrent requests)...');
  const queries = [
    'computer vision techniques',
    'reinforcement learning algorithms',
    'transformer architecture',
  ];

  const startTime = Date.now();
  const results = await Promise.all(
    queries.map(q => researchAgent.execute(q))
  );
  const duration = Date.now() - startTime;

  console.log(`   Processed ${queries.length} queries in ${duration}ms`);
  console.log(`   Average: ${(duration / queries.length).toFixed(0)}ms per query`);
  results.forEach((result, i) => {
    console.log(`   ${i + 1}. "${queries[i]}": ${result.length} chars`);
  });
  console.log();

  console.log('=== Example Complete ===');
  console.log('\nKey Features Demonstrated:');
  console.log('✓ Basic research execution');
  console.log('✓ Custom compression ratios');
  console.log('✓ Multiple reranking strategies');
  console.log('✓ Self-reflection capability');
  console.log('✓ Orchestrator integration');
  console.log('✓ Concurrent processing');
}

// Run example
main().catch((error) => {
  console.error('Error running example:', error);
  process.exit(1);
});
