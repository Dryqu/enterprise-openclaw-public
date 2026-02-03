/**
 * Tests for Document Compression Utility
 * Following Reality-Grounded TDD - tests written FIRST
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { DocumentCompressor, CompressionOptions } from '../../../extensions/agent-library/utils/compression';

describe('DocumentCompressor', () => {
  let compressor: DocumentCompressor;

  beforeEach(() => {
    compressor = new DocumentCompressor();
  });

  describe('Basic Compression', () => {
    it('should compress long text to shorter version', async () => {
      const longText = `
        Artificial Intelligence (AI) is revolutionizing the way we live and work.
        Machine learning algorithms can now process vast amounts of data to identify
        patterns and make predictions. Deep learning, a subset of machine learning,
        uses neural networks with multiple layers to analyze complex data structures.
        Natural language processing enables computers to understand and generate human
        language. Computer vision allows machines to interpret and understand visual
        information from the world. Reinforcement learning helps AI systems learn
        through trial and error. These technologies are being applied across various
        industries including healthcare, finance, transportation, and entertainment.
      `;

      const compressed = await compressor.compress(longText);

      expect(compressed.length).toBeLessThan(longText.length);
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('should preserve key information during compression', async () => {
      const text = 'Machine learning is a subset of artificial intelligence.';
      const compressed = await compressor.compress(text);

      // Key terms should be preserved
      const keyTerms = ['machine learning', 'artificial intelligence'];
      const lowerCompressed = compressed.toLowerCase();

      const preservedCount = keyTerms.filter(term =>
        lowerCompressed.includes(term) || lowerCompressed.includes(term.replace(' ', ''))
      ).length;

      expect(preservedCount).toBeGreaterThan(0);
    });

    it('should handle empty text', async () => {
      await expect(compressor.compress('')).rejects.toThrow('Cannot compress empty text');
    });

    it('should handle very short text', async () => {
      const shortText = 'AI is powerful.';
      const compressed = await compressor.compress(shortText);

      // Short text should remain mostly unchanged
      expect(compressed.length).toBeGreaterThan(0);
    });
  });

  describe('Compression Ratio', () => {
    it('should respect target compression ratio', async () => {
      const text = `
        Quantum computing leverages quantum mechanical phenomena such as superposition
        and entanglement to perform computations. Unlike classical computers that use
        bits (0 or 1), quantum computers use quantum bits or qubits that can exist in
        multiple states simultaneously. This allows quantum computers to solve certain
        problems exponentially faster than classical computers.
      `;

      const options: CompressionOptions = {
        targetRatio: 0.5, // Compress to 50% of original
      };

      const compressed = await compressor.compress(text, options);
      const ratio = compressed.length / text.length;

      // Should be approximately 50% (with some tolerance)
      expect(ratio).toBeLessThan(0.7);
      expect(ratio).toBeGreaterThan(0.3);
    });

    it('should handle different compression ratios', async () => {
      const text = 'This is a test sentence with multiple words that can be compressed.';

      const light = await compressor.compress(text, { targetRatio: 0.8 });
      const heavy = await compressor.compress(text, { targetRatio: 0.3 });

      expect(light.length).toBeGreaterThan(heavy.length);
    });
  });

  describe('Selective Compression', () => {
    it('should preserve important sentences', async () => {
      const text = `
        Introduction to the topic. This is the most important finding of our research.
        Additional context and background information. Some supplementary details.
        The conclusion summarizes everything.
      `;

      const options: CompressionOptions = {
        preserveFirstSentence: true,
        preserveLastSentence: true,
      };

      const compressed = await compressor.compress(text, options);

      expect(compressed).toContain('Introduction');
      expect(compressed).toContain('conclusion');
    });

    it('should prioritize content based on keywords', async () => {
      const text = `
        The weather is nice today. Machine learning models require training data.
        Trees are green. Deep neural networks use backpropagation. Birds can fly.
      `;

      const options: CompressionOptions = {
        keywords: ['machine learning', 'neural networks'],
      };

      const compressed = await compressor.compress(text, options);

      // Should preserve sentences with keywords
      expect(compressed.toLowerCase()).toMatch(/machine learning|neural network/);
    });
  });

  describe('Batch Compression', () => {
    it('should compress multiple documents', async () => {
      const documents = [
        'First document about artificial intelligence and machine learning.',
        'Second document discussing natural language processing techniques.',
        'Third document exploring computer vision applications.',
      ];

      const compressed = await compressor.compressBatch(documents);

      expect(compressed).toHaveLength(3);
      compressed.forEach((doc, i) => {
        expect(doc.length).toBeLessThanOrEqual(documents[i].length);
        expect(doc.length).toBeGreaterThan(0);
      });
    });

    it('should handle empty batch', async () => {
      const compressed = await compressor.compressBatch([]);
      expect(compressed).toHaveLength(0);
    });
  });

  describe('Compression Strategies', () => {
    it('should support extractive compression', async () => {
      const text = `
        Sentence one provides context. Sentence two contains key information.
        Sentence three adds details. Sentence four has crucial data.
      `;

      const options: CompressionOptions = {
        strategy: 'extractive', // Select important sentences
      };

      const compressed = await compressor.compress(text, options);

      expect(compressed.length).toBeLessThan(text.length);
      expect(compressed.length).toBeGreaterThan(0);
    });

    it('should support abstractive compression', async () => {
      const text = 'The quick brown fox jumps over the lazy dog.';

      const options: CompressionOptions = {
        strategy: 'abstractive', // Generate summary
      };

      const compressed = await compressor.compress(text, options);

      expect(compressed.length).toBeGreaterThan(0);
    });

    it('should support hybrid compression', async () => {
      const text = `
        Machine learning is a method of data analysis. It automates analytical model
        building. It is a branch of artificial intelligence. ML uses algorithms that
        iteratively learn from data.
      `;

      const options: CompressionOptions = {
        strategy: 'hybrid', // Combine extractive and abstractive
      };

      const compressed = await compressor.compress(text, options);

      expect(compressed.length).toBeLessThan(text.length);
      expect(compressed.length).toBeGreaterThan(0);
    });
  });

  describe('Quality Metrics', () => {
    it('should provide compression statistics', async () => {
      const text = 'This is a test document that needs compression for analysis.';

      const result = await compressor.compressWithStats(text);

      expect(result).toHaveProperty('compressed');
      expect(result).toHaveProperty('originalLength');
      expect(result).toHaveProperty('compressedLength');
      expect(result).toHaveProperty('compressionRatio');
      expect(result.compressionRatio).toBeLessThan(1);
    });

    it('should calculate information retention score', async () => {
      const text = 'Machine learning models learn patterns from data.';

      const result = await compressor.compressWithStats(text);

      expect(result).toHaveProperty('informationRetention');
      expect(result.informationRetention).toBeGreaterThan(0);
      expect(result.informationRetention).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    it('should handle compression errors gracefully', async () => {
      const invalidText = null as any;

      await expect(compressor.compress(invalidText)).rejects.toThrow();
    });

    it('should handle very long documents', async () => {
      const veryLongText = 'word '.repeat(100000);

      const compressed = await compressor.compress(veryLongText);

      expect(compressed.length).toBeLessThan(veryLongText.length);
    });
  });
});
