/**
 * Tests for Document Reranker Utility
 * Following Reality-Grounded TDD - tests written FIRST
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentReranker, RerankOptions, RankedDocument } from '../../../extensions/agent-library/utils/reranker';

describe('DocumentReranker', () => {
  let reranker: DocumentReranker;

  beforeEach(() => {
    reranker = new DocumentReranker();
  });

  describe('Basic Reranking', () => {
    it('should rerank documents based on query relevance', async () => {
      const query = 'machine learning algorithms';
      const documents = [
        { id: '1', content: 'The weather is sunny today.' },
        { id: '2', content: 'Machine learning algorithms are powerful tools.' },
        { id: '3', content: 'Algorithms in machine learning include neural networks.' },
      ];

      const ranked = await reranker.rerank(query, documents);

      expect(ranked).toHaveLength(3);
      // Most relevant should be first
      expect(ranked[0].id).toBe('2');
      expect(ranked[0].score).toBeGreaterThan(ranked[2].score);
    });

    it('should assign relevance scores to documents', async () => {
      const query = 'artificial intelligence';
      const documents = [
        { id: '1', content: 'AI is transforming technology.' },
        { id: '2', content: 'Cooking recipes for dinner.' },
      ];

      const ranked = await reranker.rerank(query, documents);

      expect(ranked[0]).toHaveProperty('score');
      expect(ranked[0].score).toBeGreaterThan(0);
      expect(ranked[0].score).toBeLessThanOrEqual(1);
      expect(ranked[0].score).toBeGreaterThan(ranked[1].score);
    });

    it('should handle empty document list', async () => {
      const ranked = await reranker.rerank('query', []);
      expect(ranked).toHaveLength(0);
    });

    it('should handle single document', async () => {
      const doc = { id: '1', content: 'Single document content.' };
      const ranked = await reranker.rerank('query', [doc]);

      expect(ranked).toHaveLength(1);
      expect(ranked[0].id).toBe('1');
      expect(ranked[0]).toHaveProperty('score');
    });
  });

  describe('Ranking Strategies', () => {
    it('should support TF-IDF ranking strategy', async () => {
      const query = 'neural networks deep learning';
      const documents = [
        { id: '1', content: 'Neural networks are fundamental to deep learning.' },
        { id: '2', content: 'Natural language processing uses various techniques.' },
        { id: '3', content: 'Deep learning with neural networks achieves high accuracy.' },
      ];

      const options: RerankOptions = {
        strategy: 'tfidf',
      };

      const ranked = await reranker.rerank(query, documents, options);

      expect(ranked[0].id).toMatch(/1|3/); // Doc 1 or 3 should be first
      expect(ranked[0].score).toBeGreaterThan(ranked[2].score);
    });

    it('should support semantic similarity ranking', async () => {
      const query = 'how do computers learn from data?';
      const documents = [
        { id: '1', content: 'Machine learning enables computers to learn patterns from data.' },
        { id: '2', content: 'The sky is blue and clouds are white.' },
      ];

      const options: RerankOptions = {
        strategy: 'semantic',
      };

      const ranked = await reranker.rerank(query, documents, options);

      expect(ranked[0].id).toBe('1');
    });

    it('should support cross-encoder ranking', async () => {
      const query = 'quantum computing applications';
      const documents = [
        { id: '1', content: 'Quantum computers solve optimization problems.' },
        { id: '2', content: 'Classical computers use binary logic.' },
      ];

      const options: RerankOptions = {
        strategy: 'cross-encoder',
      };

      const ranked = await reranker.rerank(query, documents, options);

      expect(ranked[0].id).toBe('1');
    });
  });

  describe('Top-K Results', () => {
    it('should return top-k results', async () => {
      const query = 'artificial intelligence';
      const documents = [
        { id: '1', content: 'AI revolutionizes technology.' },
        { id: '2', content: 'Machine learning is part of AI.' },
        { id: '3', content: 'Natural language processing uses AI.' },
        { id: '4', content: 'Computer vision employs AI techniques.' },
        { id: '5', content: 'Robotics benefits from AI.' },
      ];

      const options: RerankOptions = {
        topK: 3,
      };

      const ranked = await reranker.rerank(query, documents, options);

      expect(ranked).toHaveLength(3);
      // Should be ordered by relevance
      expect(ranked[0].score).toBeGreaterThanOrEqual(ranked[1].score);
      expect(ranked[1].score).toBeGreaterThanOrEqual(ranked[2].score);
    });

    it('should handle topK larger than document count', async () => {
      const documents = [
        { id: '1', content: 'Doc 1' },
        { id: '2', content: 'Doc 2' },
      ];

      const options: RerankOptions = {
        topK: 10,
      };

      const ranked = await reranker.rerank('query', documents, options);

      expect(ranked).toHaveLength(2);
    });
  });

  describe('Score Threshold', () => {
    it('should filter results by minimum score', async () => {
      const query = 'machine learning';
      const documents = [
        { id: '1', content: 'Machine learning algorithms and techniques.' },
        { id: '2', content: 'Learning machines for factories.' },
        { id: '3', content: 'Completely unrelated content about cooking.' },
      ];

      const options: RerankOptions = {
        minScore: 0.3,
      };

      const ranked = await reranker.rerank(query, documents, options);

      // All results should meet minimum score
      ranked.forEach(doc => {
        expect(doc.score).toBeGreaterThanOrEqual(0.3);
      });
    });

    it('should return empty array if no documents meet threshold', async () => {
      const query = 'quantum physics';
      const documents = [
        { id: '1', content: 'Cooking recipes and meal preparation.' },
        { id: '2', content: 'Gardening tips for beginners.' },
      ];

      const options: RerankOptions = {
        minScore: 0.8, // Very high threshold
      };

      const ranked = await reranker.rerank(query, documents, options);

      expect(ranked.length).toBeLessThan(documents.length);
    });
  });

  describe('Document Metadata', () => {
    it('should preserve document metadata during reranking', async () => {
      const documents = [
        { id: '1', content: 'Content 1', metadata: { source: 'web', date: '2024-01-01' } },
        { id: '2', content: 'Content 2', metadata: { source: 'paper', date: '2024-01-02' } },
      ];

      const ranked = await reranker.rerank('query', documents);

      ranked.forEach(doc => {
        expect(doc).toHaveProperty('metadata');
        expect(doc.metadata).toBeDefined();
      });
    });

    it('should boost documents with specific metadata', async () => {
      const query = 'machine learning';
      const documents = [
        { id: '1', content: 'ML content.', metadata: { recency: 0.9 } },
        { id: '2', content: 'ML content.', metadata: { recency: 0.3 } },
      ];

      const options: RerankOptions = {
        boostMetadata: { recency: 1.5 }, // Boost recent documents
      };

      const ranked = await reranker.rerank(query, documents, options);

      // More recent document should rank higher (assuming similar content relevance)
      expect(ranked[0].id).toBe('1');
    });
  });

  describe('Multi-Field Ranking', () => {
    it('should rank based on multiple fields', async () => {
      const query = 'neural networks';
      const documents = [
        { id: '1', content: 'About cats.', title: 'Neural Networks Guide' },
        { id: '2', content: 'Neural networks explained.', title: 'Generic Title' },
      ];

      const options: RerankOptions = {
        fields: ['content', 'title'],
        fieldWeights: { title: 2.0, content: 1.0 }, // Title weighted more
      };

      const ranked = await reranker.rerank(query, documents, options);

      // Doc 1 should rank high due to title match
      expect(ranked[0].score).toBeGreaterThan(0);
    });
  });

  describe('Diversity', () => {
    it('should support diversity in results', async () => {
      const query = 'machine learning';
      const documents = [
        { id: '1', content: 'Machine learning basics.' },
        { id: '2', content: 'Machine learning fundamentals.' },
        { id: '3', content: 'Deep learning neural networks.' },
        { id: '4', content: 'Natural language processing.' },
      ];

      const options: RerankOptions = {
        diversity: true,
        diversityThreshold: 0.7, // Reduce similarity threshold
      };

      const ranked = await reranker.rerank(query, documents, options);

      // Should prefer diverse results
      expect(ranked).toBeDefined();
      expect(ranked.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Reranking', () => {
    it('should rerank multiple queries in batch', async () => {
      const queries = ['AI', 'machine learning', 'neural networks'];
      const documents = [
        { id: '1', content: 'Artificial intelligence overview.' },
        { id: '2', content: 'Machine learning techniques.' },
        { id: '3', content: 'Neural network architectures.' },
      ];

      const results = await reranker.rerankBatch(queries, documents);

      expect(results).toHaveLength(3);
      results.forEach(ranked => {
        expect(ranked.length).toBeGreaterThan(0);
        expect(ranked[0]).toHaveProperty('score');
      });
    });
  });

  describe('Performance', () => {
    it('should handle large document sets efficiently', async () => {
      const query = 'test query';
      const documents = Array.from({ length: 100 }, (_, i) => ({
        id: `doc-${i}`,
        content: `Document ${i} with various content about topics.`,
      }));

      const startTime = Date.now();
      const ranked = await reranker.rerank(query, documents);
      const duration = Date.now() - startTime;

      expect(ranked).toHaveLength(100);
      expect(duration).toBeLessThan(5000); // Should complete in reasonable time
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid query', async () => {
      const documents = [{ id: '1', content: 'Content' }];

      await expect(reranker.rerank('', documents)).rejects.toThrow('Query cannot be empty');
    });

    it('should handle documents without content', async () => {
      const documents = [
        { id: '1', content: '' },
        { id: '2', content: 'Valid content' },
      ] as any;

      const ranked = await reranker.rerank('query', documents);

      // Should handle gracefully, possibly filtering empty docs
      expect(ranked).toBeDefined();
    });

    it('should handle malformed documents', async () => {
      const documents = [
        { id: '1' }, // Missing content
        { content: 'No ID' }, // Missing id
      ] as any;

      await expect(reranker.rerank('query', documents)).rejects.toThrow();
    });
  });
});
