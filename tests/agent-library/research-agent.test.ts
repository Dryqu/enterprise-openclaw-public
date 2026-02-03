/**
 * Tests for ResearchAgent
 * Following Reality-Grounded TDD - tests written FIRST
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ResearchAgent } from '../../extensions/agent-library/utility-agents/research-agent';

describe('ResearchAgent', () => {
  let agent: ResearchAgent;

  beforeEach(() => {
    agent = new ResearchAgent({
      agentName: 'research',
      agentDescription: 'Deep research agent with compression and reranking',
      selfReflection: {
        enabled: true,
        maxAttempts: 2,
      },
    });
  });

  describe('Agent Interface', () => {
    it('should follow AI Refinery agent interface', () => {
      expect(agent).toHaveProperty('execute');
      expect(agent).toHaveProperty('selfReflect');
      expect(agent).toHaveProperty('getConfig');
      expect(typeof agent.execute).toBe('function');
      expect(typeof agent.selfReflect).toBe('function');
    });

    it('should have correct agent metadata', () => {
      const config = agent.getConfig();
      expect(config.agentName).toBe('research');
      expect(config.agentDescription).toContain('research');
      expect(config.selfReflection?.enabled).toBe(true);
    });
  });

  describe('Research Pipeline', () => {
    it('should execute complete research pipeline', async () => {
      const query = 'What are the latest developments in quantum computing?';

      const result = await agent.execute(query);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should search, compress, rerank, and synthesize', async () => {
      const query = 'Explain machine learning algorithms';

      // Spy on internal methods
      const searchSpy = vi.spyOn(agent as any, 'searchDocuments');
      const compressSpy = vi.spyOn(agent as any, 'compressDocuments');
      const rerankSpy = vi.spyOn(agent as any, 'rerankDocuments');
      const synthesizeSpy = vi.spyOn(agent as any, 'synthesizeResponse');

      await agent.execute(query);

      expect(searchSpy).toHaveBeenCalled();
      expect(compressSpy).toHaveBeenCalled();
      expect(rerankSpy).toHaveBeenCalled();
      expect(synthesizeSpy).toHaveBeenCalled();
    });

    it('should handle pipeline errors gracefully', async () => {
      const query = 'test query';

      // Mock search to fail
      vi.spyOn(agent as any, 'searchDocuments').mockRejectedValue(
        new Error('Search failed')
      );

      await expect(agent.execute(query)).rejects.toThrow('Research failed');
    });
  });

  describe('Document Search', () => {
    it('should search and retrieve relevant documents', async () => {
      const query = 'artificial intelligence applications';

      const documents = await agent.search(query);

      expect(Array.isArray(documents)).toBe(true);
      expect(documents.length).toBeGreaterThan(0);

      // Check document structure
      const firstDoc = documents[0];
      expect(firstDoc).toHaveProperty('id');
      expect(firstDoc).toHaveProperty('content');
      expect(firstDoc).toHaveProperty('source');
    });

    it('should limit number of search results', async () => {
      const query = 'neural networks';

      const documents = await agent.search(query, { maxResults: 5 });

      expect(documents.length).toBeLessThanOrEqual(5);
    });

    it('should handle search with no results', async () => {
      const query = 'xyzabc123veryrarequery';

      const documents = await agent.search(query);

      expect(Array.isArray(documents)).toBe(true);
    });
  });

  describe('Document Compression', () => {
    it('should compress documents to reduce length', async () => {
      const query = 'machine learning';

      const result = await agent.research(query);

      expect(result).toHaveProperty('compressedDocuments');
      expect(Array.isArray(result.compressedDocuments)).toBe(true);

      // Check compression occurred
      if (result.originalDocuments && result.compressedDocuments.length > 0) {
        const originalLength = result.originalDocuments.reduce(
          (sum, doc) => sum + doc.content.length,
          0
        );
        const compressedLength = result.compressedDocuments.reduce(
          (sum, doc) => sum + doc.content.length,
          0
        );

        expect(compressedLength).toBeLessThanOrEqual(originalLength);
      }
    });

    it('should preserve key information during compression', async () => {
      const query = 'deep learning neural networks';

      const result = await agent.research(query);

      // Compressed documents should still contain relevant terms
      const allContent = result.compressedDocuments
        .map(doc => doc.content.toLowerCase())
        .join(' ');

      expect(allContent.length).toBeGreaterThan(0);
    });

    it('should support configurable compression ratio', async () => {
      const query = 'AI ethics';

      const lightCompression = await agent.research(query, {
        compressionRatio: 0.8,
      });

      const heavyCompression = await agent.research(query, {
        compressionRatio: 0.3,
      });

      // Heavy compression should result in shorter content
      const lightLength = lightCompression.compressedDocuments.reduce(
        (sum, doc) => sum + doc.content.length,
        0
      );
      const heavyLength = heavyCompression.compressedDocuments.reduce(
        (sum, doc) => sum + doc.content.length,
        0
      );

      expect(heavyLength).toBeLessThanOrEqual(lightLength);
    });
  });

  describe('Document Reranking', () => {
    it('should rerank documents by relevance', async () => {
      const query = 'quantum computing applications';

      const result = await agent.research(query);

      expect(result).toHaveProperty('rankedDocuments');
      expect(Array.isArray(result.rankedDocuments)).toBe(true);

      // Documents should have relevance scores
      result.rankedDocuments.forEach(doc => {
        expect(doc).toHaveProperty('score');
        expect(doc.score).toBeGreaterThanOrEqual(0);
        expect(doc.score).toBeLessThanOrEqual(1);
      });

      // Documents should be ordered by score (descending)
      for (let i = 0; i < result.rankedDocuments.length - 1; i++) {
        expect(result.rankedDocuments[i].score).toBeGreaterThanOrEqual(
          result.rankedDocuments[i + 1].score
        );
      }
    });

    it('should support different reranking strategies', async () => {
      const query = 'machine learning';

      const tfidfResult = await agent.research(query, {
        rerankStrategy: 'tfidf',
      });

      const semanticResult = await agent.research(query, {
        rerankStrategy: 'semantic',
      });

      expect(tfidfResult.rankedDocuments).toBeDefined();
      expect(semanticResult.rankedDocuments).toBeDefined();
    });

    it('should filter low-relevance documents', async () => {
      const query = 'neural networks';

      const result = await agent.research(query, {
        minRelevanceScore: 0.3,
      });

      // All ranked documents should meet minimum score
      result.rankedDocuments.forEach(doc => {
        expect(doc.score).toBeGreaterThanOrEqual(0.3);
      });
    });
  });

  describe('Response Synthesis', () => {
    it('should synthesize coherent response from documents', async () => {
      const query = 'What is transfer learning in AI?';

      const response = await agent.execute(query);

      // Response should be well-formatted
      expect(response).toBeDefined();
      expect(response.length).toBeGreaterThan(100);
      expect(response).toContain('transfer learning');
    });

    it('should include sources in synthesized response', async () => {
      const query = 'Explain reinforcement learning';

      const response = await agent.execute(query, { includeSources: true });

      // Should reference sources
      expect(response.toLowerCase()).toMatch(/source|reference/);
    });

    it('should support different synthesis styles', async () => {
      const query = 'Computer vision techniques';

      const summary = await agent.execute(query, {
        synthesisStyle: 'summary',
      });

      const detailed = await agent.execute(query, {
        synthesisStyle: 'detailed',
      });

      expect(summary.length).toBeGreaterThan(0);
      expect(detailed.length).toBeGreaterThan(0);
      // Detailed should generally be longer
      expect(detailed.length).toBeGreaterThanOrEqual(summary.length);
    });
  });

  describe('Self-Reflection', () => {
    it('should perform self-reflection on research results', async () => {
      const query = 'quantum computing';
      const result = 'Basic information about quantum computing.';

      const reflected = await agent.selfReflect(query, result);

      expect(reflected).toBeDefined();
      expect(typeof reflected).toBe('string');
    });

    it('should validate research quality', async () => {
      const query = 'deep learning';
      const poorResult = 'Not much information.';

      const reflected = await agent.selfReflect(query, poorResult);

      // Should identify quality issues
      expect(reflected).toBeDefined();
    });

    it('should skip reflection when disabled', async () => {
      const noReflectionAgent = new ResearchAgent({
        agentName: 'no_reflection',
        agentDescription: 'Agent without reflection',
        selfReflection: {
          enabled: false,
          maxAttempts: 1,
        },
      });

      const result = 'Some research result';
      const reflected = await noReflectionAgent.selfReflect('query', result);

      expect(reflected).toBe(result);
    });
  });

  describe('Configuration', () => {
    it('should support custom configuration', () => {
      const customAgent = new ResearchAgent({
        agentName: 'custom_research',
        agentDescription: 'Custom research agent',
        llm: 'ollama:phi4',
        temperature: 0.7,
        maxTokens: 4096,
        compressionRatio: 0.5,
        topK: 5,
      });

      const config = customAgent.getConfig();
      expect(config.llm).toBe('ollama:phi4');
      expect(config.temperature).toBe(0.7);
      expect(config.maxTokens).toBe(4096);
      expect(config.compressionRatio).toBe(0.5);
      expect(config.topK).toBe(5);
    });

    it('should use default values when not specified', () => {
      const defaultAgent = new ResearchAgent({
        agentName: 'default',
        agentDescription: 'Default agent',
      });

      const config = defaultAgent.getConfig();
      expect(config.compressionRatio).toBeDefined();
      expect(config.topK).toBeDefined();
    });
  });

  describe('Integration with Orchestrator', () => {
    it('should work as executor function', async () => {
      const executorFn = (query: string) => agent.execute(query);

      const result = await executorFn('test query');

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
    });

    it('should accept context parameter', async () => {
      const context = {
        previousResearch: [],
        userPreferences: { detailLevel: 'high' },
      };

      const result = await agent.execute('test query', context);

      expect(result).toBeDefined();
    });
  });

  describe('Research Quality', () => {
    it('should provide comprehensive research', async () => {
      const query = 'What are GANs in machine learning?';

      const result = await agent.execute(query);

      // Should be substantial and informative
      expect(result.length).toBeGreaterThan(200);
    });

    it('should handle complex multi-part queries', async () => {
      const query = 'Compare supervised, unsupervised, and reinforcement learning';

      const result = await agent.execute(query);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(100);
    });

    it('should provide recent and relevant information', async () => {
      const query = 'Latest trends in natural language processing';

      const result = await agent.execute(query);

      expect(result).toBeDefined();
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty query', async () => {
      await expect(agent.execute('')).rejects.toThrow('Query cannot be empty');
    });

    it('should handle network errors', async () => {
      vi.spyOn(agent as any, 'searchDocuments').mockRejectedValue(
        new Error('Network error')
      );

      await expect(agent.execute('test')).rejects.toThrow('Research failed');
    });

    it('should handle compression errors', async () => {
      vi.spyOn(agent as any, 'compressDocuments').mockRejectedValue(
        new Error('Compression failed')
      );

      await expect(agent.execute('test')).rejects.toThrow('Research failed');
    });

    it('should handle reranking errors', async () => {
      vi.spyOn(agent as any, 'rerankDocuments').mockRejectedValue(
        new Error('Reranking failed')
      );

      await expect(agent.execute('test')).rejects.toThrow('Research failed');
    });
  });

  describe('Performance', () => {
    it('should complete research in reasonable time', async () => {
      const query = 'machine learning basics';

      const startTime = Date.now();
      await agent.execute(query);
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(10000); // 10 seconds
    });

    it('should handle multiple concurrent research requests', async () => {
      const queries = [
        'AI ethics',
        'neural networks',
        'quantum computing',
      ];

      const results = await Promise.all(
        queries.map(q => agent.execute(q))
      );

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });
});
