/**
 * BaseSuperAgent - AI Refinery compatible super agent for multi-agent coordination
 *
 * Implements comprehensive orchestration pipeline:
 * 1. Task Decomposition: Break complex tasks into subtasks
 * 2. Agent Routing: Select appropriate utility agents for each subtask
 * 3. Execution Coordination: Run agents in sequence or parallel
 * 4. Result Aggregation: Combine outputs from multiple agents
 * 5. Failure Recovery: Handle agent failures gracefully
 */

export interface SuperAgentConfig {
  agentName: string;
  agentDescription: string;
  selfReflection?: {
    enabled: boolean;
    maxAttempts: number;
  };
  llm?: string;
  temperature?: number;
  maxTokens?: number;
  maxTurns?: number;
  parallelExecution?: boolean;
  failureStrategy?: 'retry' | 'skip' | 'abort';
  maxRetries?: number;
  failOnMaxTurns?: boolean;
  timeout?: number;
}

export interface SubTask {
  id: string;
  description: string;
  agentType: string; // 'search', 'research', 'analytics', 'planner'
  dependencies?: string[]; // IDs of prerequisite subtasks
}

export interface SubTaskResult {
  subtaskId: string;
  result: string;
  status: 'completed' | 'failed';
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface UtilityAgent {
  execute(query: string, context?: any): Promise<string>;
  selfReflect(query: string, result: string): Promise<string>;
  getConfig(): any;
}

type ProgressCallback = (subtaskId: string, status: string) => void;

/**
 * BaseSuperAgent following AI Refinery agent interface
 */
export class BaseSuperAgent {
  private config: Required<SuperAgentConfig>;
  private utilityAgents: Map<string, UtilityAgent>;
  private turnCount: number;
  private progressCallbacks: ProgressCallback[];

  constructor(config: SuperAgentConfig) {
    // Validate configuration
    if (!config.agentName || config.agentName.trim().length === 0) {
      throw new Error('Agent name is required');
    }
    if (!config.agentDescription || config.agentDescription.trim().length === 0) {
      throw new Error('Agent description is required');
    }

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
      maxTurns: config.maxTurns || 50,
      parallelExecution: config.parallelExecution || false,
      failureStrategy: config.failureStrategy || 'skip',
      maxRetries: config.maxRetries || 3,
      failOnMaxTurns: config.failOnMaxTurns || false,
      timeout: config.timeout || 60000,
    };

    this.utilityAgents = new Map();
    this.turnCount = 0;
    this.progressCallbacks = [];
  }

  /**
   * Get agent configuration
   */
  getConfig(): Required<SuperAgentConfig> {
    return this.config;
  }

  /**
   * Register a utility agent
   */
  registerUtilityAgent(name: string, agent: UtilityAgent): void {
    if (!agent || typeof agent.execute !== 'function') {
      throw new Error('Invalid agent: must have execute method');
    }

    if (this.utilityAgents.has(name)) {
      throw new Error(`Agent with name "${name}" is already registered`);
    }

    this.utilityAgents.set(name, agent);
  }

  /**
   * Get list of registered agent names
   */
  getRegisteredAgents(): string[] {
    return Array.from(this.utilityAgents.keys());
  }

  /**
   * Select an agent by type
   */
  selectAgent(agentType: string): UtilityAgent {
    const agent = this.utilityAgents.get(agentType);
    if (!agent) {
      throw new Error(`No agent registered for type "${agentType}"`);
    }
    return agent;
  }

  /**
   * Register progress callback
   */
  onProgress(callback: ProgressCallback): void {
    this.progressCallbacks.push(callback);
  }

  /**
   * Notify progress listeners
   */
  private notifyProgress(subtaskId: string, status: string): void {
    this.progressCallbacks.forEach(callback => {
      try {
        callback(subtaskId, status);
      } catch (error) {
        // Ignore callback errors
      }
    });
  }

  /**
   * Get current turn count
   */
  getTurnCount(): number {
    return this.turnCount;
  }

  /**
   * Main execution method - AI Refinery interface
   */
  async execute(taskDescription: string, context?: any): Promise<string> {
    if (!taskDescription || taskDescription.trim().length === 0) {
      throw new Error('Task cannot be empty');
    }

    if (this.utilityAgents.size === 0) {
      throw new Error('No utility agents registered. Please register at least one agent.');
    }

    // Reset turn count for new execution
    this.turnCount = 0;

    try {
      // Step 1: Decompose task into subtasks
      const subtasks = await this.decomposeTask(taskDescription);

      // Step 2: Execute subtasks with coordination
      const results = await this.executeSubtasks(subtasks, context);

      // Step 3: Aggregate results
      const aggregated = this.aggregateResults(results);

      return aggregated;
    } catch (error: any) {
      throw new Error(`Super agent execution failed: ${error.message}`);
    }
  }

  /**
   * Decompose task into subtasks
   */
  async decomposeTask(taskDescription: string): Promise<SubTask[]> {
    if (!taskDescription || taskDescription.trim().length === 0) {
      throw new Error('Task cannot be empty');
    }

    const subtasks: SubTask[] = [];
    const lowerTask = taskDescription.toLowerCase();

    // Pattern-based task decomposition
    // This is a heuristic approach - in production, could use LLM for better decomposition

    let taskId = 1;

    // Identify search requirements
    if (lowerTask.includes('search') || lowerTask.includes('find') || lowerTask.includes('look for')) {
      subtasks.push({
        id: `task-${taskId++}`,
        description: `Search for information about: ${taskDescription}`,
        agentType: 'search',
        dependencies: [],
      });
    }

    // Identify research requirements
    if (lowerTask.includes('research') || lowerTask.includes('investigate') || lowerTask.includes('deep dive') || lowerTask.includes('study')) {
      const deps = subtasks.length > 0 ? [subtasks[subtasks.length - 1].id] : [];
      subtasks.push({
        id: `task-${taskId++}`,
        description: `Research in depth: ${taskDescription}`,
        agentType: 'research',
        dependencies: deps,
      });
    }

    // Identify analytics requirements
    if (lowerTask.includes('analy') || lowerTask.includes('statistics') || lowerTask.includes('metrics') || lowerTask.includes('data')) {
      const deps = subtasks.length > 0 ? [subtasks[subtasks.length - 1].id] : [];
      subtasks.push({
        id: `task-${taskId++}`,
        description: `Analyze data and generate insights: ${taskDescription}`,
        agentType: 'analytics',
        dependencies: deps,
      });
    }

    // Identify planning requirements
    if (lowerTask.includes('plan') || lowerTask.includes('strategy') || lowerTask.includes('roadmap') || lowerTask.includes('next steps')) {
      const deps = subtasks.length > 0 ? [subtasks[subtasks.length - 1].id] : [];
      subtasks.push({
        id: `task-${taskId++}`,
        description: `Create plan for: ${taskDescription}`,
        agentType: 'planner',
        dependencies: deps,
      });
    }

    // If no specific patterns matched, try to infer from task complexity
    if (subtasks.length === 0) {
      // For simple tasks, use the most appropriate single agent
      if (this.utilityAgents.has('search')) {
        subtasks.push({
          id: `task-${taskId++}`,
          description: taskDescription,
          agentType: 'search',
          dependencies: [],
        });
      } else if (this.utilityAgents.has('research')) {
        subtasks.push({
          id: `task-${taskId++}`,
          description: taskDescription,
          agentType: 'research',
          dependencies: [],
        });
      } else {
        // Use first available agent
        const firstAgent = this.utilityAgents.keys().next().value;
        subtasks.push({
          id: `task-${taskId++}`,
          description: taskDescription,
          agentType: firstAgent,
          dependencies: [],
        });
      }
    }

    // Handle complex multi-step tasks
    if (lowerTask.includes(' and ') || lowerTask.includes(', ') || lowerTask.includes(' then ')) {
      // Task has multiple parts - try to decompose further
      const parts = taskDescription.split(/\s+and\s+|\s*,\s+|\s+then\s+/i);

      if (parts.length > 1) {
        // Clear previous subtasks and rebuild from parts
        subtasks.length = 0;
        taskId = 1;

        parts.forEach((part, index) => {
          const partLower = part.toLowerCase();
          let agentType = 'search'; // Default

          // Determine agent type for each part
          if (partLower.includes('research') || partLower.includes('investigate')) {
            agentType = 'research';
          } else if (partLower.includes('analy') || partLower.includes('statistics')) {
            agentType = 'analytics';
          } else if (partLower.includes('plan') || partLower.includes('strategy')) {
            agentType = 'planner';
          } else if (partLower.includes('search') || partLower.includes('find')) {
            agentType = 'search';
          }

          // Verify agent is registered
          if (!this.utilityAgents.has(agentType)) {
            agentType = this.utilityAgents.keys().next().value || 'search';
          }

          // Add dependencies for sequential execution
          const deps = index > 0 ? [`task-${index}`] : [];

          subtasks.push({
            id: `task-${taskId++}`,
            description: part.trim(),
            agentType,
            dependencies: deps,
          });
        });
      }
    }

    return subtasks;
  }

  /**
   * Execute subtasks with coordination
   */
  async executeSubtasks(subtasks: SubTask[], context?: any): Promise<SubTaskResult[]> {
    const results: SubTaskResult[] = [];
    const completedTasks = new Set<string>();
    const taskResults = new Map<string, string>();

    // Check max turns limit
    if (this.config.maxTurns && subtasks.length > this.config.maxTurns) {
      if (this.config.failOnMaxTurns) {
        throw new Error(`Max turns exceeded: ${subtasks.length} subtasks but limit is ${this.config.maxTurns}`);
      }
      // Truncate to max turns
      subtasks = subtasks.slice(0, this.config.maxTurns);
    }

    // Topological sort to respect dependencies
    const sorted = this.topologicalSort(subtasks);

    // Execute in dependency order
    for (const subtask of sorted) {
      // Check if we've exceeded max turns during execution
      if (this.turnCount >= this.config.maxTurns) {
        if (this.config.failOnMaxTurns) {
          throw new Error('Max turns exceeded during execution');
        }
        break;
      }

      this.turnCount++;
      this.notifyProgress(subtask.id, 'started');

      try {
        // Wait for dependencies to complete
        if (subtask.dependencies && subtask.dependencies.length > 0) {
          const allDepsCompleted = subtask.dependencies.every(dep => completedTasks.has(dep));
          if (!allDepsCompleted) {
            throw new Error(`Dependencies not met for ${subtask.id}`);
          }
        }

        // Build context with previous results
        const subtaskContext = {
          ...context,
          previousResults: Array.from(taskResults.entries()).map(([id, result]) => ({
            taskId: id,
            result,
          })),
        };

        // Execute subtask
        const result = await this.executeSubtask(subtask, subtaskContext);

        // Record success
        completedTasks.add(subtask.id);
        taskResults.set(subtask.id, result);

        results.push({
          subtaskId: subtask.id,
          result,
          status: 'completed',
        });

        this.notifyProgress(subtask.id, 'completed');
      } catch (error: any) {
        // Handle failure according to strategy
        const handled = await this.handleSubtaskFailure(subtask, error, results);

        if (!handled && this.config.failureStrategy === 'abort') {
          throw error;
        }

        this.notifyProgress(subtask.id, 'failed');
      }
    }

    return results;
  }

  /**
   * Execute a single subtask
   */
  async executeSubtask(subtask: SubTask, context?: any): Promise<string> {
    const agent = this.selectAgent(subtask.agentType);

    // Execute with retry logic if needed
    let lastError: Error | null = null;
    const maxAttempts = this.config.failureStrategy === 'retry' ? this.config.maxRetries : 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const result = await Promise.race([
          agent.execute(subtask.description, context),
          this.createTimeout(),
        ]);

        return result as string;
      } catch (error: any) {
        lastError = error;

        if (attempt < maxAttempts - 1) {
          // Wait before retry with exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError || new Error('Subtask execution failed');
  }

  /**
   * Create timeout promise
   */
  private createTimeout(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Subtask execution timeout')), this.config.timeout);
    });
  }

  /**
   * Handle subtask failure
   */
  private async handleSubtaskFailure(
    subtask: SubTask,
    error: Error,
    results: SubTaskResult[]
  ): Promise<boolean> {
    const failureResult: SubTaskResult = {
      subtaskId: subtask.id,
      result: '',
      status: 'failed',
      error: error.message,
    };

    switch (this.config.failureStrategy) {
      case 'skip':
        results.push(failureResult);
        return true; // Continue execution

      case 'retry':
        // Retry logic is handled in executeSubtask
        results.push(failureResult);
        return true;

      case 'abort':
        results.push(failureResult);
        return false; // Stop execution

      default:
        return false;
    }
  }

  /**
   * Topological sort to respect dependencies
   */
  private topologicalSort(subtasks: SubTask[]): SubTask[] {
    const sorted: SubTask[] = [];
    const visited = new Set<string>();
    const temp = new Set<string>();
    const taskMap = new Map(subtasks.map(t => [t.id, t]));

    const visit = (taskId: string) => {
      if (temp.has(taskId)) {
        // Cycle detected - skip
        return;
      }
      if (visited.has(taskId)) {
        return;
      }

      temp.add(taskId);

      const task = taskMap.get(taskId);
      if (task && task.dependencies) {
        for (const depId of task.dependencies) {
          visit(depId);
        }
      }

      temp.delete(taskId);
      visited.add(taskId);

      if (task) {
        sorted.push(task);
      }
    };

    // Visit all tasks
    for (const subtask of subtasks) {
      if (!visited.has(subtask.id)) {
        visit(subtask.id);
      }
    }

    return sorted;
  }

  /**
   * Aggregate results from multiple subtasks
   */
  aggregateResults(results: SubTaskResult[]): string {
    if (results.length === 0) {
      return 'No results to aggregate.';
    }

    let aggregated = '=== Multi-Agent Coordination Results ===\n\n';

    const completed = results.filter(r => r.status === 'completed');
    const failed = results.filter(r => r.status === 'failed');

    aggregated += `Completed Tasks: ${completed.length}/${results.length}\n`;

    if (failed.length > 0) {
      aggregated += `Failed Tasks: ${failed.length}\n`;
    }

    aggregated += '\n';

    // Add completed results
    if (completed.length > 0) {
      aggregated += '=== Task Results ===\n\n';

      completed.forEach((result, index) => {
        aggregated += `Task ${index + 1} (${result.subtaskId}):\n`;
        aggregated += `${result.result}\n\n`;
        aggregated += '---\n\n';
      });
    }

    // Add failure summary if any
    if (failed.length > 0) {
      aggregated += '=== Failed Tasks ===\n\n';

      failed.forEach((result, index) => {
        aggregated += `Task ${index + 1} (${result.subtaskId}):\n`;
        aggregated += `Error: ${result.error || 'Unknown error'}\n\n`;
      });
    }

    // Add summary
    aggregated += '=== Summary ===\n\n';

    if (completed.length === results.length) {
      aggregated += 'All tasks completed successfully.\n';
    } else if (completed.length > 0) {
      aggregated += `Partial completion: ${completed.length} of ${results.length} tasks succeeded.\n`;
    } else {
      aggregated += 'All tasks failed.\n';
    }

    return aggregated.trim();
  }

  /**
   * Self-reflection - validate and potentially improve results
   * AI Refinery interface
   */
  async selfReflect(taskDescription: string, result: string): Promise<string> {
    if (!this.config.selfReflection.enabled) {
      return result;
    }

    try {
      return await this.performReflection(taskDescription, result);
    } catch (error: any) {
      console.warn(`Self-reflection failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Perform self-reflection on coordination results
   */
  private async performReflection(taskDescription: string, result: string): Promise<string> {
    const qualityIssues: string[] = [];

    // Check if result is too short
    if (result.length < 100) {
      qualityIssues.push('Result may be too brief for a complex coordination task');
    }

    // Check if result contains coordination markers
    if (!result.includes('Multi-Agent Coordination') && !result.includes('Task Results')) {
      qualityIssues.push('Result format may be incorrect');
    }

    // Check if result indicates failures
    if (result.includes('Failed Tasks')) {
      qualityIssues.push('Some subtasks failed - consider retry or alternative approach');
    }

    // Check if all tasks completed
    if (result.includes('All tasks failed')) {
      qualityIssues.push('Critical: All subtasks failed - task decomposition or agent selection may need review');
    }

    // Check if result addresses the task
    const taskKeywords = taskDescription.toLowerCase().split(' ').filter(w => w.length > 3);
    const hasTaskContext = taskKeywords.some(keyword =>
      result.toLowerCase().includes(keyword)
    );

    if (!hasTaskContext && taskKeywords.length > 0) {
      qualityIssues.push('Result may not fully address the original task');
    }

    // If quality issues detected, append suggestions
    if (qualityIssues.length > 0) {
      return result + `\n\n[Self-Reflection Notes:\n${qualityIssues.map(issue => `- ${issue}`).join('\n')}\n]`;
    }

    return result;
  }
}
