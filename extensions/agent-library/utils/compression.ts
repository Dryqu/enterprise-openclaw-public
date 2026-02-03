/**
 * Document Compression Utility
 * Implements text compression for research documents
 *
 * Supports multiple compression strategies:
 * - Extractive: Select important sentences
 * - Abstractive: Generate summaries (LLM-based)
 * - Hybrid: Combine both approaches
 */

export interface CompressionOptions {
  targetRatio?: number; // Target compression ratio (0-1)
  strategy?: 'extractive' | 'abstractive' | 'hybrid';
  preserveFirstSentence?: boolean;
  preserveLastSentence?: boolean;
  keywords?: string[];
}

export interface CompressionStats {
  compressed: string;
  originalLength: number;
  compressedLength: number;
  compressionRatio: number;
  informationRetention: number;
}

/**
 * Document Compressor
 *
 * Production Note: This implementation uses rule-based extraction.
 * For production, integrate with LLMLingua or similar:
 * - LLMLingua: https://github.com/microsoft/LLMLingua
 * - Use LLM-based summarization for abstractive compression
 */
export class DocumentCompressor {
  /**
   * Compress text document
   */
  async compress(text: string, options: CompressionOptions = {}): Promise<string> {
    if (!text || text.trim().length === 0) {
      throw new Error('Cannot compress empty text');
    }

    if (text === null || text === undefined) {
      throw new Error('Invalid text input');
    }

    const targetRatio = options.targetRatio || 0.5;
    const strategy = options.strategy || 'extractive';

    try {
      switch (strategy) {
        case 'extractive':
          return await this.extractiveCompress(text, targetRatio, options);
        case 'abstractive':
          return await this.abstractiveCompress(text, targetRatio, options);
        case 'hybrid':
          return await this.hybridCompress(text, targetRatio, options);
        default:
          return await this.extractiveCompress(text, targetRatio, options);
      }
    } catch (error: any) {
      throw new Error(`Compression failed: ${error.message}`);
    }
  }

  /**
   * Compress with statistics
   */
  async compressWithStats(text: string, options: CompressionOptions = {}): Promise<CompressionStats> {
    const compressed = await this.compress(text, options);

    const originalLength = text.length;
    const compressedLength = compressed.length;
    const compressionRatio = compressedLength / originalLength;

    // Simple information retention score based on keyword preservation
    const informationRetention = this.calculateInformationRetention(text, compressed);

    return {
      compressed,
      originalLength,
      compressedLength,
      compressionRatio,
      informationRetention,
    };
  }

  /**
   * Compress multiple documents
   */
  async compressBatch(documents: string[], options: CompressionOptions = {}): Promise<string[]> {
    if (documents.length === 0) {
      return [];
    }

    return Promise.all(documents.map(doc => this.compress(doc, options)));
  }

  /**
   * Extractive compression - select important sentences
   */
  private async extractiveCompress(
    text: string,
    targetRatio: number,
    options: CompressionOptions
  ): Promise<string> {
    const sentences = this.splitIntoSentences(text);

    if (sentences.length === 0) {
      return text.trim();
    }

    // If text is very short and target ratio is high, don't compress much
    if (text.length < 50 && targetRatio > 0.7) {
      return text.trim();
    }

    // For single sentence with high target ratio, minimal compression
    if (sentences.length === 1 && targetRatio > 0.7) {
      return sentences[0].trim();
    }

    // For single sentence, compress by removing less important words
    if (sentences.length === 1) {
      const words = sentences[0].split(/\s+/);
      const targetWords = Math.max(Math.ceil(words.length * targetRatio), 1);
      return words.slice(0, targetWords).join(' ').trim();
    }

    // Score sentences by importance
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      index,
      score: this.scoreSentence(sentence, text, options.keywords),
    }));

    // Preserve first and last sentences if requested
    const mustPreserve = new Set<number>();
    if (options.preserveFirstSentence && sentences.length > 0) {
      mustPreserve.add(0);
    }
    if (options.preserveLastSentence && sentences.length > 0) {
      mustPreserve.add(sentences.length - 1);
    }

    // Sort by score and select top sentences
    scoredSentences.sort((a, b) => b.score - a.score);

    const targetLength = text.length * targetRatio;
    const selected = new Set<number>(mustPreserve);
    let currentLength = Array.from(mustPreserve).reduce(
      (sum, idx) => sum + sentences[idx].length,
      0
    );

    for (const item of scoredSentences) {
      if (selected.has(item.index)) continue;

      if (currentLength + item.sentence.length <= targetLength) {
        selected.add(item.index);
        currentLength += item.sentence.length;
      }

      if (currentLength >= targetLength) break;
    }

    // Reconstruct in original order
    const compressed = Array.from(selected)
      .sort((a, b) => a - b)
      .map(idx => sentences[idx])
      .join(' ')
      .trim();

    // Ensure we never return empty string - return at least the first sentence
    if (compressed.length === 0 && sentences.length > 0) {
      return sentences[0].trim();
    }

    return compressed;
  }

  /**
   * Abstractive compression - generate summary
   * Note: In production, this would use an LLM for summarization
   */
  private async abstractiveCompress(
    text: string,
    targetRatio: number,
    options: CompressionOptions
  ): Promise<string> {
    // For now, use extractive as fallback
    // In production, this would call an LLM:
    // const summary = await llm.summarize(text, { maxLength: targetLength });

    return this.extractiveCompress(text, targetRatio, options);
  }

  /**
   * Hybrid compression - combine extractive and abstractive
   */
  private async hybridCompress(
    text: string,
    targetRatio: number,
    options: CompressionOptions
  ): Promise<string> {
    // First pass: extractive compression to 70% of target
    const firstPass = await this.extractiveCompress(text, targetRatio * 1.4, options);

    // Second pass: further compress to target
    const secondPass = await this.extractiveCompress(
      firstPass,
      targetRatio / 1.4,
      options
    );

    return secondPass;
  }

  /**
   * Split text into sentences
   */
  private splitIntoSentences(text: string): string[] {
    // Simple sentence splitting - in production use NLP library
    return text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 0);
  }

  /**
   * Score sentence importance
   */
  private scoreSentence(sentence: string, fullText: string, keywords?: string[]): number {
    let score = 0;

    // Length score (prefer medium-length sentences)
    const words = sentence.split(/\s+/);
    if (words.length >= 5 && words.length <= 30) {
      score += 0.3;
    }

    // Keyword matching
    if (keywords && keywords.length > 0) {
      const lowerSentence = sentence.toLowerCase();
      for (const keyword of keywords) {
        if (lowerSentence.includes(keyword.toLowerCase())) {
          score += 0.5;
        }
      }
    }

    // Position score (first and last sentences are often important)
    const sentences = this.splitIntoSentences(fullText);
    const index = sentences.indexOf(sentence);
    if (index === 0 || index === sentences.length - 1) {
      score += 0.2;
    }

    // Term frequency score
    const terms = sentence.toLowerCase().split(/\s+/);
    const uniqueTerms = new Set(terms);
    score += (uniqueTerms.size / terms.length) * 0.3; // Lexical diversity

    return score;
  }

  /**
   * Calculate information retention score
   */
  private calculateInformationRetention(original: string, compressed: string): number {
    // Simple keyword-based retention score
    const originalWords = new Set(
      original
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    const compressedWords = new Set(
      compressed
        .toLowerCase()
        .split(/\s+/)
        .filter(w => w.length > 3)
    );

    if (originalWords.size === 0) return 1;

    let preserved = 0;
    for (const word of compressedWords) {
      if (originalWords.has(word)) {
        preserved++;
      }
    }

    return Math.min(preserved / originalWords.size, 1);
  }
}
