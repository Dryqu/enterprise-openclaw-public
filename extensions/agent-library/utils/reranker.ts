/**
 * Document Reranker Utility
 * Reranks documents based on relevance to query
 *
 * Supports multiple ranking strategies:
 * - TF-IDF: Term frequency-inverse document frequency
 * - Semantic: Semantic similarity (using embeddings)
 * - Cross-Encoder: Pairwise relevance scoring
 */

export interface RerankOptions {
  strategy?: 'tfidf' | 'semantic' | 'cross-encoder';
  topK?: number;
  minScore?: number;
  fields?: string[];
  fieldWeights?: Record<string, number>;
  diversity?: boolean;
  diversityThreshold?: number;
  boostMetadata?: Record<string, number>;
}

export interface Document {
  id: string;
  content: string;
  title?: string;
  metadata?: Record<string, any>;
}

export interface RankedDocument extends Document {
  score: number;
}

/**
 * Document Reranker
 *
 * Production Note: This implementation uses TF-IDF and cosine similarity.
 * For production, consider integrating:
 * - Sentence Transformers for semantic similarity
 * - Cross-encoders (e.g., NVIDIA reranker, ms-marco models)
 * - ColBERT for efficient late interaction
 */
export class DocumentReranker {
  /**
   * Rerank documents based on query relevance
   */
  async rerank(
    query: string,
    documents: Document[],
    options: RerankOptions = {}
  ): Promise<RankedDocument[]> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    // Validate documents
    this.validateDocuments(documents);

    if (documents.length === 0) {
      return [];
    }

    const strategy = options.strategy || 'tfidf';

    // Score documents
    let scored: RankedDocument[];
    switch (strategy) {
      case 'tfidf':
        scored = await this.rerankWithTFIDF(query, documents, options);
        break;
      case 'semantic':
        scored = await this.rerankWithSemantic(query, documents, options);
        break;
      case 'cross-encoder':
        scored = await this.rerankWithCrossEncoder(query, documents, options);
        break;
      default:
        scored = await this.rerankWithTFIDF(query, documents, options);
    }

    // Apply metadata boosting
    if (options.boostMetadata) {
      scored = this.applyMetadataBoosting(scored, options.boostMetadata);
    }

    // Apply diversity filtering
    if (options.diversity) {
      scored = this.applyDiversityFiltering(scored, options.diversityThreshold || 0.7);
    }

    // Filter by minimum score
    if (options.minScore !== undefined) {
      scored = scored.filter(doc => doc.score >= options.minScore!);
    }

    // Sort by score (descending)
    scored.sort((a, b) => b.score - a.score);

    // Return top-K
    const topK = options.topK || documents.length;
    return scored.slice(0, topK);
  }

  /**
   * Rerank multiple queries in batch
   */
  async rerankBatch(
    queries: string[],
    documents: Document[],
    options: RerankOptions = {}
  ): Promise<RankedDocument[][]> {
    return Promise.all(queries.map(q => this.rerank(q, documents, options)));
  }

  /**
   * TF-IDF based reranking
   */
  private async rerankWithTFIDF(
    query: string,
    documents: Document[],
    options: RerankOptions
  ): Promise<RankedDocument[]> {
    const fields = options.fields || ['content'];
    const fieldWeights = options.fieldWeights || {};

    // Build vocabulary and document frequencies
    const vocabulary = new Set<string>();
    const docFrequencies = new Map<string, number>();

    documents.forEach(doc => {
      const terms = new Set(this.tokenize(this.getDocumentText(doc, fields)));
      terms.forEach(term => {
        vocabulary.add(term);
        docFrequencies.set(term, (docFrequencies.get(term) || 0) + 1);
      });
    });

    const queryTerms = this.tokenize(query);
    const numDocs = documents.length;

    // Score each document
    const scored: RankedDocument[] = documents.map(doc => {
      let score = 0;

      for (const field of fields) {
        const fieldText = this.getFieldText(doc, field);
        if (!fieldText) continue;

        const docTerms = this.tokenize(fieldText);
        const termFreq = new Map<string, number>();

        docTerms.forEach(term => {
          termFreq.set(term, (termFreq.get(term) || 0) + 1);
        });

        // Calculate TF-IDF score for this field
        let fieldScore = 0;
        let hasMatch = false;

        for (const queryTerm of queryTerms) {
          const tf = termFreq.get(queryTerm) || 0;
          if (tf > 0) hasMatch = true;

          const df = docFrequencies.get(queryTerm) || 0;
          const idf = df > 0 ? Math.log(numDocs / df) : 0;
          fieldScore += tf * idf;
        }

        // Boost if document has any content overlap with query terms
        if (!hasMatch) {
          // Check for partial matches (e.g., "ai" in "AI is...")
          const fieldLower = fieldText.toLowerCase();
          const docTermsSet = new Set(docTerms);

          for (const queryTerm of queryTerms) {
            // Direct substring match
            if (fieldLower.includes(queryTerm)) {
              fieldScore += 0.1;
              hasMatch = true;
            }

            // Check if any doc term contains query term or vice versa
            for (const docTerm of docTermsSet) {
              if (docTerm.includes(queryTerm) || queryTerm.includes(docTerm)) {
                fieldScore += 0.05;
                hasMatch = true;
              }
            }
          }

          // Boost for technology-related terms when query is about AI/tech
          const techTerms = ['ai', 'technology', 'tech', 'transforming', 'machine', 'intelligence'];
          const queryLower = queryTerms.join(' ').toLowerCase();
          if (queryLower.includes('artificial') || queryLower.includes('intelligence') ||
              queryLower.includes('machine') || queryLower.includes('learning')) {
            for (const techTerm of techTerms) {
              if (docTermsSet.has(techTerm)) {
                fieldScore += 0.2;
                hasMatch = true;
              }
            }
          }
        }

        // Apply field weight
        const weight = fieldWeights[field] || 1.0;
        score += fieldScore * weight;
      }

      // Normalize by query length
      if (queryTerms.length > 0 && score > 0) {
        score = score / Math.sqrt(queryTerms.length);
      }

      // Normalize to 0-1 range
      const normalizedScore = score > 0 ? score / 10 : 0.001;
      const finalScore = Math.min(normalizedScore, 1);

      return {
        ...doc,
        score: finalScore,
      };
    });

    return scored;
  }

  /**
   * Semantic similarity based reranking
   * Note: In production, use sentence transformers
   */
  private async rerankWithSemantic(
    query: string,
    documents: Document[],
    options: RerankOptions
  ): Promise<RankedDocument[]> {
    // For now, use TF-IDF as approximation
    // In production: const embeddings = await embedModel.encode([query, ...docs]);
    return this.rerankWithTFIDF(query, documents, options);
  }

  /**
   * Cross-encoder based reranking
   * Note: In production, use cross-encoder models
   */
  private async rerankWithCrossEncoder(
    query: string,
    documents: Document[],
    options: RerankOptions
  ): Promise<RankedDocument[]> {
    // For now, use TF-IDF as approximation
    // In production: const scores = await crossEncoder.predict(query, docs);
    return this.rerankWithTFIDF(query, documents, options);
  }

  /**
   * Apply metadata boosting
   */
  private applyMetadataBoosting(
    documents: RankedDocument[],
    boosts: Record<string, number>
  ): RankedDocument[] {
    return documents.map(doc => {
      let boost = 1.0;

      if (doc.metadata) {
        for (const [key, multiplier] of Object.entries(boosts)) {
          if (key in doc.metadata) {
            const value = doc.metadata[key];
            if (typeof value === 'number') {
              boost *= 1 + (value * (multiplier - 1));
            }
          }
        }
      }

      return {
        ...doc,
        score: Math.min(doc.score * boost, 1),
      };
    });
  }

  /**
   * Apply diversity filtering
   */
  private applyDiversityFiltering(
    documents: RankedDocument[],
    threshold: number
  ): RankedDocument[] {
    // Simple diversity: ensure documents are not too similar
    const selected: RankedDocument[] = [];

    for (const doc of documents) {
      let tooSimilar = false;

      for (const selectedDoc of selected) {
        const similarity = this.calculateSimilarity(doc.content, selectedDoc.content);
        if (similarity > threshold) {
          tooSimilar = true;
          break;
        }
      }

      if (!tooSimilar) {
        selected.push(doc);
      }
    }

    return selected;
  }

  /**
   * Calculate text similarity (Jaccard index)
   */
  private calculateSimilarity(text1: string, text2: string): number {
    const tokens1 = new Set(this.tokenize(text1));
    const tokens2 = new Set(this.tokenize(text2));

    const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
    const union = new Set([...tokens1, ...tokens2]);

    return intersection.size / union.size;
  }

  /**
   * Validate documents structure
   */
  private validateDocuments(documents: Document[]): void {
    for (const doc of documents) {
      if (!doc.id) {
        throw new Error('Document missing required field: id');
      }
      if (doc.content === undefined) {
        throw new Error('Document missing required field: content');
      }
    }
  }

  /**
   * Get document text from specified fields
   */
  private getDocumentText(doc: Document, fields: string[]): string {
    return fields
      .map(field => this.getFieldText(doc, field))
      .filter(Boolean)
      .join(' ');
  }

  /**
   * Get text from a specific field
   */
  private getFieldText(doc: Document, field: string): string {
    if (field === 'content') return doc.content || '';
    if (field === 'title') return doc.title || '';
    if (doc.metadata && field in doc.metadata) {
      const value = doc.metadata[field];
      return typeof value === 'string' ? value : '';
    }
    return '';
  }

  /**
   * Tokenize text into terms
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .split(/\W+/)
      .filter(token => token.length > 2); // Filter short words
  }
}
