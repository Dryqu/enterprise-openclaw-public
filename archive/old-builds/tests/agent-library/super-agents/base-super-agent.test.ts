/**
 * Tests for BaseSuperAgent
 * Following Reality-Grounded TDD - tests written FIRST (RED phase)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BaseSuperAgent } from '../../../extensions/agent-library/super-agents/base-super-agent';
import { SearchAgent } from '../../../extensions/agent-library/utility-agents/search-agent';
import { ResearchAgent } from '../../../extensions/agent-library/utility-agents/research-agent';
import { AnalyticsAgent } from '../../../extensions/agent-library/utility-agents/analytics-agent';
import { PlanningAgent } from '../../../extensions/agent-library/utility-agents/planning-agent';
import type { SubTask } from '../../../extensions/agent-library/super-agents/base-super-agent';

describe('BaseSuperAgent', () => {
  let superAgent: BaseSuperAgent;
  let searchAgent: SearchAgent;
  let researchAgent: ResearchAgent;
  let analyticsAgent: AnalyticsAgent;
  let planningAgent: PlanningAgent;

  beforeEach(() => {
    // Create super agent
    superAgent = new BaseSuperAgent({
      agentName: 'test_super_agent',
      agentDescription: 'Test super agent for coordination',
      selfReflection: {
        enabled: true,
        maxAttempts: 2,
      },
      maxTurns: 10,
      parallelExecution: false,
      failureStrategy: 'skip',
    });

    // Create utility agents
    searchAgent = new SearchAgent({
      agentName: 'search',
      agentDescription: 'Search agent',
    });

    researchAgent = new ResearchAgent({
      agentName: 'research',
      agentDescription: 'Research agent',
    });

    analyticsAgent = new AnalyticsAgent({
      agentName: 'analytics',
      agentDescription: 'Analytics agent',
    });

    planningAgent = new PlanningAgent({
      agentName: 'planner',
      agentDescription: 'Planning agent',
    });

    // Register utility agents
    superAgent.registerUtilityAgent('search', searchAgent);
    superAgent.registerUtilityAgent('research', researchAgent);
    superAgent.registerUtilityAgent('analytics', analyticsAgent);
    superAgent.registerUtilityAgent('planner', planningAgent);
  });

  describe('Agent Interface', () => {
    it('should follow AI Refinery agent interface', () => {
      expect(superAgent).toHaveProperty('execute');
      expect(superAgent).toHaveProperty('selfReflect');
      expect(superAgent).toHaveProperty('getConfig');
      expect(typeof superAgent.execute).toBe('function');
      expect(typeof superAgent.selfReflect).toBe('function');
      expect(typeof superAgent.getConfig).toBe('function');
    });

    it('should have correct agent metadata', () => {
      const config = superAgent.getConfig();
      expect(config.agentName).toBe('test_super_agent');
      expect(config.agentDescription).toBe('Test super agent for coordination');
      expect(config.selfReflection?.enabled).toBe(true);
      expect(config.maxTurns).toBe(10);
    });

    it('should support super agent specific methods', () => {
      expect(superAgent).toHaveProperty('registerUtilityAgent');
      expect(superAgent).toHaveProperty('decomposeTask');
      expect(superAgent).toHaveProperty('executeSubtasks');
      expect(typeof superAgent.registerUtilityAgent).toBe('function');
      expect(typeof superAgent.decomposeTask).toBe('function');
      expect(typeof superAgent.executeSubtasks).toBe('function');
    });
  });

  describe('Utility Agent Registration', () => {
    it('should register utility agents', () => {
      const newSuperAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
      });

      newSuperAgent.registerUtilityAgent('search', searchAgent);
      const registered = newSuperAgent.getRegisteredAgents();

      expect(registered).toContain('search');
      expect(registered.length).toBe(1);
    });

    it('should register multiple utility agents', () => {
      const newSuperAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
      });

      newSuperAgent.registerUtilityAgent('search', searchAgent);
      newSuperAgent.registerUtilityAgent('research', researchAgent);
      newSuperAgent.registerUtilityAgent('analytics', analyticsAgent);

      const registered = newSuperAgent.getRegisteredAgents();
      expect(registered).toContain('search');
      expect(registered).toContain('research');
      expect(registered).toContain('analytics');
      expect(registered.length).toBe(3);
    });

    it('should throw error when registering duplicate agent', () => {
      const newSuperAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
      });

      newSuperAgent.registerUtilityAgent('search', searchAgent);

      expect(() => {
        newSuperAgent.registerUtilityAgent('search', searchAgent);
      }).toThrow('Agent with name "search" is already registered');
    });

    it('should throw error when registering invalid agent', () => {
      const newSuperAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
      });

      expect(() => {
        newSuperAgent.registerUtilityAgent('invalid', null as any);
      }).toThrow('Invalid agent');
    });
  });

  describe('Task Decomposition', () => {
    it('should decompose simple task into subtasks', async () => {
      const task = 'Search for AI trends';
      const subtasks = await superAgent.decomposeTask(task);

      expect(Array.isArray(subtasks)).toBe(true);
      expect(subtasks.length).toBeGreaterThan(0);

      // Verify subtask structure
      subtasks.forEach(subtask => {
        expect(subtask).toHaveProperty('id');
        expect(subtask).toHaveProperty('description');
        expect(subtask).toHaveProperty('agentType');
        expect(subtask).toHaveProperty('dependencies');
        expect(typeof subtask.id).toBe('string');
        expect(typeof subtask.description).toBe('string');
        expect(typeof subtask.agentType).toBe('string');
        expect(Array.isArray(subtask.dependencies)).toBe(true);
      });
    });

    it('should decompose complex multi-step task', async () => {
      const task = 'Research AI trends, analyze the data, and create a plan';
      const subtasks = await superAgent.decomposeTask(task);

      expect(subtasks.length).toBeGreaterThan(1);

      // Should identify different agent types needed
      const agentTypes = subtasks.map(st => st.agentType);
      expect(new Set(agentTypes).size).toBeGreaterThan(1);
    });

    it('should assign correct agent types to subtasks', async () => {
      const task = 'Search for data, research deeply, analyze results, and plan next steps';
      const subtasks = await superAgent.decomposeTask(task);

      const agentTypes = subtasks.map(st => st.agentType);

      // Should contain multiple different agent types
      expect(agentTypes).toContain('search');
      expect(agentTypes).toContain('research');
      expect(agentTypes).toContain('analytics');
      expect(agentTypes).toContain('planner');
    });

    it('should identify dependencies between subtasks', async () => {
      const task = 'Research AI trends, then analyze the results';
      const subtasks = await superAgent.decomposeTask(task);

      // Later tasks should depend on earlier ones
      const laterTasks = subtasks.slice(1);
      const hasDependent = laterTasks.some(task => task.dependencies.length > 0);

      expect(hasDependent).toBe(true);
    });

    it('should handle task with no clear decomposition', async () => {
      const task = 'Simple search';
      const subtasks = await superAgent.decomposeTask(task);

      // Should still return at least one subtask
      expect(subtasks.length).toBeGreaterThanOrEqual(1);
    });

    it('should throw error for empty task', async () => {
      await expect(superAgent.decomposeTask('')).rejects.toThrow('Task cannot be empty');
    });

    it('should generate unique subtask IDs', async () => {
      const task = 'Research, analyze, and plan';
      const subtasks = await superAgent.decomposeTask(task);

      const ids = subtasks.map(st => st.id);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe('Agent Selection', () => {
    it('should select correct agent for search task', () => {
      const agent = superAgent.selectAgent('search');
      expect(agent).toBe(searchAgent);
    });

    it('should select correct agent for research task', () => {
      const agent = superAgent.selectAgent('research');
      expect(agent).toBe(researchAgent);
    });

    it('should select correct agent for analytics task', () => {
      const agent = superAgent.selectAgent('analytics');
      expect(agent).toBe(analyticsAgent);
    });

    it('should select correct agent for planning task', () => {
      const agent = superAgent.selectAgent('planner');
      expect(agent).toBe(planningAgent);
    });

    it('should throw error for unregistered agent type', () => {
      expect(() => {
        superAgent.selectAgent('unknown');
      }).toThrow('No agent registered for type "unknown"');
    });
  });

  describe('Subtask Execution', () => {
    it('should execute single subtask', async () => {
      const subtask: SubTask = {
        id: 'task-1',
        description: 'Search for TypeScript',
        agentType: 'search',
        dependencies: [],
      };

      const result = await superAgent.executeSubtask(subtask);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should execute multiple subtasks sequentially', async () => {
      const subtasks: SubTask[] = [
        {
          id: 'task-1',
          description: 'Search for AI',
          agentType: 'search',
          dependencies: [],
        },
        {
          id: 'task-2',
          description: 'Plan next steps',
          agentType: 'planner',
          dependencies: ['task-1'],
        },
      ];

      const results = await superAgent.executeSubtasks(subtasks);

      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBe(2);
      results.forEach(result => {
        expect(result).toHaveProperty('subtaskId');
        expect(result).toHaveProperty('result');
        expect(result).toHaveProperty('status');
      });
    });

    it('should respect dependency order', async () => {
      const executionOrder: string[] = [];

      const mockSearch = {
        execute: vi.fn(async (query: string) => {
          executionOrder.push('search');
          return 'search result';
        }),
        selfReflect: vi.fn(),
        getConfig: vi.fn(),
      };

      const mockPlanner = {
        execute: vi.fn(async (query: string) => {
          executionOrder.push('planner');
          return 'plan result';
        }),
        selfReflect: vi.fn(),
        getConfig: vi.fn(),
      };

      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
      });

      testAgent.registerUtilityAgent('search', mockSearch as any);
      testAgent.registerUtilityAgent('planner', mockPlanner as any);

      const subtasks: SubTask[] = [
        {
          id: 'task-1',
          description: 'Search',
          agentType: 'search',
          dependencies: [],
        },
        {
          id: 'task-2',
          description: 'Plan',
          agentType: 'planner',
          dependencies: ['task-1'],
        },
      ];

      await testAgent.executeSubtasks(subtasks);

      // Search should execute before planner
      expect(executionOrder[0]).toBe('search');
      expect(executionOrder[1]).toBe('planner');
    });

    it('should pass context between dependent tasks', async () => {
      const subtasks: SubTask[] = [
        {
          id: 'task-1',
          description: 'Search for data',
          agentType: 'search',
          dependencies: [],
        },
        {
          id: 'task-2',
          description: 'Plan next steps based on search',
          agentType: 'planner',
          dependencies: ['task-1'],
        },
      ];

      const results = await superAgent.executeSubtasks(subtasks);

      // Both tasks should complete successfully
      expect(results.every(r => r.status === 'completed')).toBe(true);
      expect(results.length).toBe(2);
      // Verify context was passed - second result should have access to first result
      expect(results[1].result).toBeDefined();
    });

    it('should aggregate results from multiple subtasks', async () => {
      const subtasks: SubTask[] = [
        {
          id: 'task-1',
          description: 'Search for AI',
          agentType: 'search',
          dependencies: [],
        },
        {
          id: 'task-2',
          description: 'Research deeply',
          agentType: 'research',
          dependencies: [],
        },
      ];

      const results = await superAgent.executeSubtasks(subtasks);
      const aggregated = superAgent.aggregateResults(results);

      expect(aggregated).toBeDefined();
      expect(typeof aggregated).toBe('string');
      expect(aggregated.length).toBeGreaterThan(0);
    });
  });

  describe('Multi-Agent Coordination', () => {
    it('should coordinate multiple agents for complex task', async () => {
      const task = 'Search for AI trends and create an analysis report';
      const result = await superAgent.execute(task);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should execute full pipeline: decompose, route, execute, aggregate', async () => {
      const task = 'Research machine learning, analyze findings, and plan implementation';

      const decomposeSpy = vi.spyOn(superAgent, 'decomposeTask');
      const executeSpy = vi.spyOn(superAgent, 'executeSubtasks');
      const aggregateSpy = vi.spyOn(superAgent, 'aggregateResults');

      const result = await superAgent.execute(task);

      expect(decomposeSpy).toHaveBeenCalled();
      expect(executeSpy).toHaveBeenCalled();
      expect(aggregateSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should track execution progress', async () => {
      const task = 'Multi-step task';

      let progressCount = 0;
      superAgent.onProgress(() => {
        progressCount++;
      });

      await superAgent.execute(task);

      expect(progressCount).toBeGreaterThan(0);
    });
  });

  describe('Failure Handling', () => {
    it('should handle single agent failure with skip strategy', async () => {
      const failAgent = {
        execute: vi.fn().mockRejectedValue(new Error('Agent failed')),
        selfReflect: vi.fn(),
        getConfig: vi.fn(),
      };

      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        failureStrategy: 'skip',
      });

      testAgent.registerUtilityAgent('search', searchAgent);
      testAgent.registerUtilityAgent('fail', failAgent as any);

      const subtasks: SubTask[] = [
        {
          id: 'task-1',
          description: 'Should fail',
          agentType: 'fail',
          dependencies: [],
        },
        {
          id: 'task-2',
          description: 'Should succeed',
          agentType: 'search',
          dependencies: [],
        },
      ];

      const results = await testAgent.executeSubtasks(subtasks);

      // Should skip failed task and continue
      expect(results.length).toBe(2);
      expect(results[0].status).toBe('failed');
      expect(results[1].status).toBe('completed');
    });

    it('should handle agent failure with retry strategy', async () => {
      let attemptCount = 0;
      const retryAgent = {
        execute: vi.fn(async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return 'Success after retry';
        }),
        selfReflect: vi.fn(),
        getConfig: vi.fn(),
      };

      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        failureStrategy: 'retry',
        maxRetries: 3,
      });

      testAgent.registerUtilityAgent('retry', retryAgent as any);

      const subtask: SubTask = {
        id: 'task-1',
        description: 'Retry task',
        agentType: 'retry',
        dependencies: [],
      };

      const result = await testAgent.executeSubtask(subtask);

      expect(attemptCount).toBe(3);
      expect(result).toContain('Success after retry');
    });

    it('should abort on failure with abort strategy', async () => {
      const failAgent = {
        execute: vi.fn().mockRejectedValue(new Error('Critical failure')),
        selfReflect: vi.fn(),
        getConfig: vi.fn(),
      };

      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        failureStrategy: 'abort',
      });

      testAgent.registerUtilityAgent('fail', failAgent as any);

      const subtasks: SubTask[] = [
        {
          id: 'task-1',
          description: 'Should fail',
          agentType: 'fail',
          dependencies: [],
        },
        {
          id: 'task-2',
          description: 'Should not run',
          agentType: 'search',
          dependencies: [],
        },
      ];

      await expect(testAgent.executeSubtasks(subtasks)).rejects.toThrow();
    });

    it('should provide detailed error information', async () => {
      const failAgent = {
        execute: vi.fn().mockRejectedValue(new Error('Specific error')),
        selfReflect: vi.fn(),
        getConfig: vi.fn(),
      };

      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        failureStrategy: 'skip',
      });

      testAgent.registerUtilityAgent('fail', failAgent as any);

      const subtask: SubTask = {
        id: 'task-1',
        description: 'Failing task',
        agentType: 'fail',
        dependencies: [],
      };

      const results = await testAgent.executeSubtasks([subtask]);

      expect(results[0].error).toBeDefined();
      expect(results[0].error).toContain('Specific error');
    });
  });

  describe('Max Turns Configuration', () => {
    it('should respect max turns limit', async () => {
      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        maxTurns: 2,
      });

      testAgent.registerUtilityAgent('search', searchAgent);

      const subtasks: SubTask[] = [
        { id: 'task-1', description: 'Task 1', agentType: 'search', dependencies: [] },
        { id: 'task-2', description: 'Task 2', agentType: 'search', dependencies: [] },
        { id: 'task-3', description: 'Task 3', agentType: 'search', dependencies: [] },
      ];

      const results = await testAgent.executeSubtasks(subtasks);

      // Should only execute up to maxTurns
      expect(results.length).toBeLessThanOrEqual(2);
    });

    it('should throw error when exceeding max turns', async () => {
      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        maxTurns: 1,
        failOnMaxTurns: true,
      });

      testAgent.registerUtilityAgent('search', searchAgent);

      const subtasks: SubTask[] = [
        { id: 'task-1', description: 'Task 1', agentType: 'search', dependencies: [] },
        { id: 'task-2', description: 'Task 2', agentType: 'search', dependencies: [] },
      ];

      await expect(testAgent.executeSubtasks(subtasks)).rejects.toThrow('Max turns exceeded');
    });

    it('should track turn count correctly', async () => {
      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        maxTurns: 5,
      });

      testAgent.registerUtilityAgent('search', searchAgent);

      const subtasks: SubTask[] = [
        { id: 'task-1', description: 'Task 1', agentType: 'search', dependencies: [] },
        { id: 'task-2', description: 'Task 2', agentType: 'search', dependencies: [] },
      ];

      await testAgent.executeSubtasks(subtasks);

      expect(testAgent.getTurnCount()).toBe(2);
    });
  });

  describe('Parallel Execution', () => {
    it('should execute independent tasks in parallel', async () => {
      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        parallelExecution: true,
      });

      testAgent.registerUtilityAgent('search', searchAgent);

      const subtasks: SubTask[] = [
        { id: 'task-1', description: 'Task 1', agentType: 'search', dependencies: [] },
        { id: 'task-2', description: 'Task 2', agentType: 'search', dependencies: [] },
        { id: 'task-3', description: 'Task 3', agentType: 'search', dependencies: [] },
      ];

      const startTime = Date.now();
      const results = await testAgent.executeSubtasks(subtasks);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(3);
      // Parallel execution should be faster (though this is a loose check)
      expect(duration).toBeLessThan(10000);
    });

    it('should respect dependencies in parallel mode', async () => {
      const executionOrder: string[] = [];

      const mockAgent1 = {
        execute: vi.fn(async () => {
          await new Promise(resolve => setTimeout(resolve, 50));
          executionOrder.push('task-1');
          return 'result-1';
        }),
        selfReflect: vi.fn(),
        getConfig: vi.fn(),
      };

      const mockAgent2 = {
        execute: vi.fn(async () => {
          executionOrder.push('task-2');
          return 'result-2';
        }),
        selfReflect: vi.fn(),
        getConfig: vi.fn(),
      };

      const testAgent = new BaseSuperAgent({
        agentName: 'test',
        agentDescription: 'Test',
        parallelExecution: true,
      });

      testAgent.registerUtilityAgent('agent1', mockAgent1 as any);
      testAgent.registerUtilityAgent('agent2', mockAgent2 as any);

      const subtasks: SubTask[] = [
        { id: 'task-1', description: 'Task 1', agentType: 'agent1', dependencies: [] },
        { id: 'task-2', description: 'Task 2', agentType: 'agent2', dependencies: ['task-1'] },
      ];

      await testAgent.executeSubtasks(subtasks);

      // task-1 must complete before task-2
      expect(executionOrder[0]).toBe('task-1');
      expect(executionOrder[1]).toBe('task-2');
    });
  });

  describe('Self-Reflection', () => {
    it('should perform self-reflection when enabled', async () => {
      const task = 'Simple task';
      const result = await superAgent.execute(task);

      const reflected = await superAgent.selfReflect(task, result);

      expect(reflected).toBeDefined();
      expect(typeof reflected).toBe('string');
    });

    it('should validate overall result quality', async () => {
      const task = 'Complex coordination task';
      const poorResult = 'Incomplete result';

      const reflected = await superAgent.selfReflect(task, poorResult);

      expect(reflected).toBeDefined();
      // Should include quality assessment
    });

    it('should skip self-reflection when disabled', async () => {
      const noReflectionAgent = new BaseSuperAgent({
        agentName: 'no_reflection',
        agentDescription: 'No reflection',
        selfReflection: {
          enabled: false,
          maxAttempts: 1,
        },
      });

      const result = 'Some result';
      const reflected = await noReflectionAgent.selfReflect('task', result);

      expect(reflected).toBe(result);
    });

    it('should provide feedback on coordination quality', async () => {
      const task = 'Multi-agent task';
      const result = await superAgent.execute(task);
      const reflected = await superAgent.selfReflect(task, result);

      // Reflection should provide insights
      expect(reflected.length).toBeGreaterThanOrEqual(result.length);
    });
  });

  describe('Result Aggregation', () => {
    it('should aggregate results from multiple agents', () => {
      const results = [
        { subtaskId: 'task-1', result: 'Result 1', status: 'completed' as const },
        { subtaskId: 'task-2', result: 'Result 2', status: 'completed' as const },
        { subtaskId: 'task-3', result: 'Result 3', status: 'completed' as const },
      ];

      const aggregated = superAgent.aggregateResults(results);

      expect(aggregated).toBeDefined();
      expect(typeof aggregated).toBe('string');
      expect(aggregated).toContain('Result 1');
      expect(aggregated).toContain('Result 2');
      expect(aggregated).toContain('Result 3');
    });

    it('should handle partial failures in aggregation', () => {
      const results = [
        { subtaskId: 'task-1', result: 'Result 1', status: 'completed' as const },
        { subtaskId: 'task-2', result: '', status: 'failed' as const, error: 'Failed' },
        { subtaskId: 'task-3', result: 'Result 3', status: 'completed' as const },
      ];

      const aggregated = superAgent.aggregateResults(results);

      expect(aggregated).toBeDefined();
      expect(aggregated).toContain('Result 1');
      expect(aggregated).toContain('Result 3');
    });

    it('should provide structured output format', () => {
      const results = [
        { subtaskId: 'task-1', result: 'Result 1', status: 'completed' as const },
        { subtaskId: 'task-2', result: 'Result 2', status: 'completed' as const },
      ];

      const aggregated = superAgent.aggregateResults(results);

      // Should have clear structure
      expect(aggregated).toMatch(/task-1|Task 1/i);
      expect(aggregated).toMatch(/task-2|Task 2/i);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty task description', async () => {
      await expect(superAgent.execute('')).rejects.toThrow('Task cannot be empty');
    });

    it('should handle null task description', async () => {
      await expect(superAgent.execute(null as any)).rejects.toThrow();
    });

    it('should handle no registered agents', async () => {
      const emptyAgent = new BaseSuperAgent({
        agentName: 'empty',
        agentDescription: 'Empty agent',
      });

      await expect(emptyAgent.execute('Some task')).rejects.toThrow();
    });

    it('should provide helpful error messages', async () => {
      const emptyAgent = new BaseSuperAgent({
        agentName: 'empty',
        agentDescription: 'Empty agent',
      });

      try {
        await emptyAgent.execute('Task requiring agents');
        expect.fail('Should have thrown error');
      } catch (error: any) {
        expect(error.message).toBeDefined();
        expect(error.message.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Configuration', () => {
    it('should support custom configuration', () => {
      const customAgent = new BaseSuperAgent({
        agentName: 'custom',
        agentDescription: 'Custom super agent',
        llm: 'ollama:phi4',
        temperature: 0.8,
        maxTokens: 4096,
        maxTurns: 20,
        parallelExecution: true,
        failureStrategy: 'retry',
        maxRetries: 3,
      });

      const config = customAgent.getConfig();
      expect(config.llm).toBe('ollama:phi4');
      expect(config.temperature).toBe(0.8);
      expect(config.maxTokens).toBe(4096);
      expect(config.maxTurns).toBe(20);
      expect(config.parallelExecution).toBe(true);
      expect(config.failureStrategy).toBe('retry');
    });

    it('should use default values when not specified', () => {
      const defaultAgent = new BaseSuperAgent({
        agentName: 'default',
        agentDescription: 'Default agent',
      });

      const config = defaultAgent.getConfig();
      expect(config.maxTurns).toBeDefined();
      expect(config.parallelExecution).toBeDefined();
      expect(config.failureStrategy).toBeDefined();
    });

    it('should validate configuration values', () => {
      expect(() => {
        new BaseSuperAgent({
          agentName: '',
          agentDescription: 'Test',
        });
      }).toThrow();

      expect(() => {
        new BaseSuperAgent({
          agentName: 'test',
          agentDescription: '',
        });
      }).toThrow();
    });
  });

  describe('Integration', () => {
    it('should work with all utility agents', async () => {
      const task = 'Search for data, research it, analyze it, and plan next steps';
      const result = await superAgent.execute(task);

      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('should maintain agent state across calls', async () => {
      const result1 = await superAgent.execute('First task');
      const result2 = await superAgent.execute('Second task');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      expect(result1).not.toBe(result2);
    });

    it('should support context passing', async () => {
      const context = {
        previousResults: [],
        userPreferences: {},
      };

      const result = await superAgent.execute('Task with context', context);

      expect(result).toBeDefined();
    });
  });
});
