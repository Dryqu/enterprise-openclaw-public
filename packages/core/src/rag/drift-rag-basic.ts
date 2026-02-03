/**
 * DRIFT RAG Basic (Open Source Version)
 *
 * Simplified DRIFT RAG without inference engine
 * - Max depth limited to 2
 * - Single-threaded only
 * - No inference engine
 * - Basic traversal strategies
 */

import { KnowledgeGraph } from '../knowledge-graph/knowledge-graph.js';
import { GraphNode, GraphEdge, SimilarityResult } from '../knowledge-graph/types.js';

export interface TraversalPath {
  nodes: GraphNode[];
  edges: GraphEdge[];
  score: number;
}

export interface DRIFTRAGBasicConfig {
  /** Knowledge graph instance to query */
  knowledgeGraph: KnowledgeGraph;

  /** Number of entry points to detect (default: 2) */
  entryPointCount?: number;

  /** Maximum traversal depth - FIXED at 2 for basic version */
  maxTraversalDepth?: 2;

  /** Number of top paths to keep (default: 3) */
  topKPaths?: number;
}

/**
 * Basic DRIFT RAG for open-source use
 * Simplified version with limited depth and no inference
 */
export class DRIFTRAGBasic {
  private config: Required<DRIFTRAGBasicConfig>;
  private graph: KnowledgeGraph;

  constructor(config: DRIFTRAGBasicConfig) {
    // Enforce max depth of 2
    this.config = {
      knowledgeGraph: config.knowledgeGraph,
      entryPointCount: config.entryPointCount ?? 2,
      maxTraversalDepth: 2, // Always 2 for basic version
      topKPaths: config.topKPaths ?? 3
    };

    this.graph = config.knowledgeGraph;
  }

  /**
   * Retrieve relevant information for a query
   */
  async retrieve(query: string): Promise<{
    paths: TraversalPath[];
    nodes: GraphNode[];
  }> {
    // 1. Find entry points via vector similarity
    const entryPoints = await this.findEntryPoints(query);

    if (entryPoints.length === 0) {
      return { paths: [], nodes: [] };
    }

    // 2. Traverse from each entry point (depth limited to 2)
    const allPaths: TraversalPath[] = [];

    for (const entryPoint of entryPoints) {
      const paths = await this.traverseFromNode(entryPoint.node, query);
      allPaths.push(...paths);
    }

    // 3. Rank and select top paths
    const rankedPaths = this.rankPaths(allPaths);
    const topPaths = rankedPaths.slice(0, this.config.topKPaths);

    // 4. Extract unique nodes from top paths
    const uniqueNodes = this.extractUniqueNodes(topPaths);

    return {
      paths: topPaths,
      nodes: uniqueNodes
    };
  }

  /**
   * Find entry points - simplified for basic version
   * In the full version, this would use vector similarity
   */
  private async findEntryPoints(query: string): Promise<SimilarityResult[]> {
    try {
      // Simplified: just get all nodes for basic version
      // Enterprise version uses vector similarity
      const allNodes = await this.graph.getAllNodes();

      // Return top N nodes as entry points with dummy scores
      const topNodes = allNodes.slice(0, this.config.entryPointCount);

      return topNodes.map((node, index) => ({
        node,
        score: 1.0 - (index * 0.1), // Dummy scores
        distance: index * 0.1
      }));
    } catch (error) {
      console.error('Error finding entry points:', error);
      return [];
    }
  }

  /**
   * Traverse from a node with max depth of 2
   */
  private async traverseFromNode(
    startNode: GraphNode,
    query: string,
    depth: number = 0,
    visitedNodes: Set<string> = new Set(),
    currentPath: { nodes: GraphNode[]; edges: GraphEdge[] } = { nodes: [], edges: [] }
  ): Promise<TraversalPath[]> {
    // Add current node
    currentPath.nodes.push(startNode);
    visitedNodes.add(startNode.id);

    // Base case: reached max depth
    if (depth >= this.config.maxTraversalDepth) {
      return [{
        nodes: [...currentPath.nodes],
        edges: [...currentPath.edges],
        score: this.calculatePathScore(currentPath.nodes)
      }];
    }

    // Get neighbors (outgoing edges only for basic version)
    const neighbors = await this.graph.getNeighbors(startNode.id, 'outgoing');

    if (neighbors.length === 0) {
      // Leaf node, return current path
      return [{
        nodes: [...currentPath.nodes],
        edges: [...currentPath.edges],
        score: this.calculatePathScore(currentPath.nodes)
      }];
    }

    const paths: TraversalPath[] = [];

    // Explore unvisited neighbors
    for (const neighbor of neighbors) {
      if (visitedNodes.has(neighbor.id)) {
        continue;
      }

      // Get edge connecting to neighbor
      const edges = await this.graph.queryEdges({
        source: startNode.id,
        target: neighbor.id
      });
      const edge = edges[0];

      if (edge) {
        const newPath = {
          nodes: [...currentPath.nodes],
          edges: [...currentPath.edges, edge]
        };

        const subPaths = await this.traverseFromNode(
          neighbor,
          query,
          depth + 1,
          new Set(visitedNodes),
          newPath
        );

        paths.push(...subPaths);
      }
    }

    // If no paths were found, return current path
    if (paths.length === 0) {
      return [{
        nodes: [...currentPath.nodes],
        edges: [...currentPath.edges],
        score: this.calculatePathScore(currentPath.nodes)
      }];
    }

    return paths;
  }

  /**
   * Calculate path score based on nodes
   */
  private calculatePathScore(nodes: GraphNode[]): number {
    if (nodes.length === 0) return 0;

    // Simple scoring: average of node relevance
    // In basic version, we just use node count as a proxy
    const pathLength = nodes.length;
    const lengthScore = Math.min(pathLength / this.config.maxTraversalDepth, 1.0);

    return lengthScore;
  }

  /**
   * Rank paths by score
   */
  private rankPaths(paths: TraversalPath[]): TraversalPath[] {
    return paths.sort((a, b) => b.score - a.score);
  }

  /**
   * Extract unique nodes from paths
   */
  private extractUniqueNodes(paths: TraversalPath[]): GraphNode[] {
    const nodeMap = new Map<string, GraphNode>();

    for (const path of paths) {
      for (const node of path.nodes) {
        if (!nodeMap.has(node.id)) {
          nodeMap.set(node.id, node);
        }
      }
    }

    return Array.from(nodeMap.values());
  }
}
