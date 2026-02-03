/**
 * ResearchAgent - AI Refinery compatible deep research agent
 *
 * Implements comprehensive research pipeline:
 * 1. Search: Retrieve relevant documents
 * 2. Compress: Reduce document length while preserving information
 * 3. Rerank: Order documents by relevance
 * 4. Synthesize: Generate coherent research response
 */

import { DocumentCompressor, CompressionOptions } from '../utils/compression';
import { DocumentReranker, RerankOptions, Document, RankedDocument } from '../utils/reranker';

export interface ResearchAgentConfig {
  agentName: string;
  agentDescription: string;
  selfReflection?: {
    enabled: boolean;
    maxAttempts: number;
  };
  llm?: string;
  temperature?: number;
  maxTokens?: number;
  compressionRatio?: number;
  topK?: number;
  timeout?: number;
}

export interface ResearchOptions {
  maxResults?: number;
  compressionRatio?: number;
  rerankStrategy?: 'tfidf' | 'semantic' | 'cross-encoder';
  minRelevanceScore?: number;
  includeSources?: boolean;
  synthesisStyle?: 'summary' | 'detailed';
}

export interface ResearchResult {
  originalDocuments?: Document[];
  compressedDocuments: Document[];
  rankedDocuments: RankedDocument[];
  synthesis: string;
}

/**
 * ResearchAgent following AI Refinery agent interface
 */
export class ResearchAgent {
  private config: Required<ResearchAgentConfig>;
  private compressor: DocumentCompressor;
  private reranker: DocumentReranker;

  constructor(config: ResearchAgentConfig) {
    this.config = {
      agentName: config.agentName,
      agentDescription: config.agentDescription,
      selfReflection: config.selfReflection || {
        enabled: false,
        maxAttempts: 1,
      },
      llm: config.llm || 'ollama:phi4',
      temperature: config.temperature || 0.7,
      maxTokens: config.maxTokens || 4096,
      compressionRatio: config.compressionRatio || 0.5,
      topK: config.topK || 5,
      timeout: config.timeout || 30000,
    };

    this.compressor = new DocumentCompressor();
    this.reranker = new DocumentReranker();
  }

  /**
   * Get agent configuration
   */
  getConfig(): Required<ResearchAgentConfig> {
    return this.config;
  }

  /**
   * Main execution method - AI Refinery interface
   */
  async execute(query: string, context?: any): Promise<string> {
    if (!query || query.trim().length === 0) {
      throw new Error('Query cannot be empty');
    }

    try {
      // Extract options from context if provided
      const options: ResearchOptions = context || {};

      // Execute research pipeline
      const result = await this.research(query, options);

      // Return synthesized response
      return result.synthesis;
    } catch (error: any) {
      throw new Error(`Research failed: ${error.message}`);
    }
  }

  /**
   * Complete research pipeline
   */
  async research(query: string, options: ResearchOptions = {}): Promise<ResearchResult> {
    // Step 1: Search for documents
    const documents = await this.searchDocuments(query, options.maxResults);

    // Step 2: Compress documents
    const compressionRatio = options.compressionRatio || this.config.compressionRatio;
    const compressedDocuments = await this.compressDocuments(documents, compressionRatio);

    // Step 3: Rerank documents
    const rerankStrategy = options.rerankStrategy || 'tfidf';
    const rankedDocuments = await this.rerankDocuments(
      query,
      compressedDocuments,
      rerankStrategy,
      options.minRelevanceScore
    );

    // Step 4: Synthesize response
    const synthesis = await this.synthesizeResponse(
      query,
      rankedDocuments,
      options
    );

    return {
      originalDocuments: documents,
      compressedDocuments,
      rankedDocuments,
      synthesis,
    };
  }

  /**
   * Search for relevant documents
   */
  async search(query: string, options: { maxResults?: number } = {}): Promise<Document[]> {
    return this.searchDocuments(query, options.maxResults);
  }

  /**
   * Internal: Search for documents
   * In production, this would call actual search APIs
   */
  private async searchDocuments(query: string, maxResults: number = 10): Promise<Document[]> {
    // Mock implementation - in production would call search APIs
    const mockDocuments: Document[] = [
      {
        id: 'doc-1',
        content: `${query} is an important topic in modern technology. It involves various
        concepts and techniques that are widely used in industry. Recent developments have
        shown significant improvements in performance and efficiency. Researchers are actively
        exploring new methods to enhance capabilities and address current limitations.`,
        source: 'research-paper',
        metadata: { recency: 0.9, credibility: 0.8 },
      },
      {
        id: 'doc-2',
        content: `A comprehensive guide to ${query} covering fundamental principles and
        advanced topics. This resource provides detailed explanations, practical examples,
        and best practices. It discusses the theoretical foundations as well as real-world
        applications across different domains.`,
        source: 'tutorial',
        metadata: { recency: 0.7, credibility: 0.9 },
      },
      {
        id: 'doc-3',
        content: `${query} has evolved significantly over the years. Early approaches were
        limited by computational constraints, but modern systems leverage powerful hardware
        and sophisticated algorithms. Current research focuses on scalability, interpretability,
        and robustness of these systems.`,
        source: 'article',
        metadata: { recency: 0.8, credibility: 0.7 },
      },
      {
        id: 'doc-4',
        content: `Practical applications of ${query} can be found in healthcare, finance,
        transportation, and many other sectors. Organizations are increasingly adopting these
        technologies to improve operations and deliver better services. Case studies demonstrate
        measurable benefits including cost reduction and enhanced accuracy.`,
        source: 'case-study',
        metadata: { recency: 0.6, credibility: 0.8 },
      },
      {
        id: 'doc-5',
        content: `Understanding ${query} requires knowledge of related concepts and methodologies.
        Key components include data processing, model training, and evaluation metrics.
        Practitioners should be aware of common pitfalls and validation techniques to ensure
        reliable results in production environments.`,
        source: 'documentation',
        metadata: { recency: 0.5, credibility: 0.9 },
      },
    ];

    return mockDocuments.slice(0, Math.min(maxResults, mockDocuments.length));
  }

  /**
   * Internal: Compress documents
   */
  private async compressDocuments(
    documents: Document[],
    compressionRatio: number
  ): Promise<Document[]> {
    const compressionOptions: CompressionOptions = {
      targetRatio: compressionRatio,
      strategy: 'extractive',
      preserveFirstSentence: true,
    };

    const compressed = await Promise.all(
      documents.map(async doc => ({
        ...doc,
        content: await this.compressor.compress(doc.content, compressionOptions),
      }))
    );

    return compressed;
  }

  /**
   * Internal: Rerank documents by relevance
   */
  private async rerankDocuments(
    query: string,
    documents: Document[],
    strategy: 'tfidf' | 'semantic' | 'cross-encoder',
    minScore?: number
  ): Promise<RankedDocument[]> {
    const rerankOptions: RerankOptions = {
      strategy,
      topK: this.config.topK,
      minScore,
    };

    return this.reranker.rerank(query, documents, rerankOptions);
  }

  /**
   * Internal: Synthesize response from ranked documents
   */
  private async synthesizeResponse(
    query: string,
    documents: RankedDocument[],
    options: ResearchOptions
  ): Promise<string> {
    if (documents.length === 0) {
      return `I couldn't find sufficient information about "${query}". Please try a different query or provide more context.`;
    }

    const style = options.synthesisStyle || 'detailed';
    const includeSources = options.includeSources ?? false;

    // Build synthesis based on style
    let synthesis = `Research Results for: "${query}"\n\n`;

    if (style === 'summary') {
      // Concise summary
      synthesis += 'Summary:\n';
      synthesis += this.generateSummary(query, documents);
    } else {
      // Detailed synthesis
      synthesis += 'Overview:\n';
      synthesis += this.generateOverview(query, documents);
      synthesis += '\n\nKey Findings:\n';
      synthesis += this.generateKeyFindings(documents);
    }

    // Add sources if requested
    if (includeSources) {
      synthesis += '\n\nSources:\n';
      documents.forEach((doc, i) => {
        synthesis += `${i + 1}. ${doc.source || 'Unknown source'} (Relevance: ${(doc.score * 100).toFixed(1)}%)\n`;
      });
    }

    return synthesis.trim();
  }

  /**
   * Generate summary from documents
   */
  private generateSummary(query: string, documents: RankedDocument[]): string {
    // Take the most relevant document's content as primary summary
    const primaryDoc = documents[0];

    // Extract key sentences
    const sentences = primaryDoc.content
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => s.length > 20)
      .slice(0, 3);

    return sentences.join('. ') + '.';
  }

  /**
   * Generate overview from documents
   */
  private generateOverview(query: string, documents: RankedDocument[]): string {
    // Combine information from top documents
    const topDocs = documents.slice(0, 3);

    let overview = `Based on analysis of ${documents.length} relevant sources, `;
    overview += `here's what we know about ${query}:\n\n`;

    topDocs.forEach((doc, i) => {
      const firstSentence = doc.content.split(/[.!?]+/)[0];
      if (firstSentence) {
        overview += `${i + 1}. ${firstSentence}.\n`;
      }
    });

    return overview;
  }

  /**
   * Generate key findings from documents
   */
  private generateKeyFindings(documents: RankedDocument[]): string {
    const findings: string[] = [];

    documents.forEach(doc => {
      // Extract meaningful sentences (simplified - in production use NLP)
      const sentences = doc.content
        .split(/[.!?]+/)
        .map(s => s.trim())
        .filter(s => s.length > 30 && s.length < 200);

      if (sentences.length > 0) {
        findings.push(`• ${sentences[0]}.`);
      }
    });

    return findings.slice(0, 5).join('\n');
  }

  /**
   * Self-reflection - validate and potentially improve results
   * AI Refinery interface
   */
  async selfReflect(query: string, result: string): Promise<string> {
    if (!this.config.selfReflection.enabled) {
      return result;
    }

    try {
      return await this.performReflection(query, result);
    } catch (error: any) {
      console.warn(`Self-reflection failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Perform self-reflection on research results
   */
  private async performReflection(query: string, result: string): Promise<string> {
    const qualityIssues: string[] = [];

    // Check if result is too short
    if (result.length < 200) {
      qualityIssues.push('Result may be too brief');
    }

    // Check if result contains key information
    if (!result.toLowerCase().includes(query.toLowerCase().split(' ')[0])) {
      qualityIssues.push('Result may not address the query directly');
    }

    // Check if sources are included when they should be
    if (!result.toLowerCase().includes('source')) {
      qualityIssues.push('Consider including sources for credibility');
    }

    // If quality issues detected, append suggestions
    if (qualityIssues.length > 0) {
      return result + `\n\n[Self-Reflection Note: ${qualityIssues.join('; ')}]`;
    }

    return result;
  }
}
