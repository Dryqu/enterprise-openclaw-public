/**
 * BaseSuperAgent Example
 *
 * Demonstrates multi-agent coordination with task decomposition,
 * intelligent routing, and result aggregation
 */

import { BaseSuperAgent } from '../extensions/agent-library/super-agents/base-super-agent';
import { SearchAgent } from '../extensions/agent-library/utility-agents/search-agent';
import { ResearchAgent } from '../extensions/agent-library/utility-agents/research-agent';
import { AnalyticsAgent } from '../extensions/agent-library/utility-agents/analytics-agent';
import { PlanningAgent } from '../extensions/agent-library/utility-agents/planning-agent';

/**
 * Example 1: Basic Multi-Agent Coordination
 */
async function basicCoordination() {
  console.log('=== Example 1: Basic Multi-Agent Coordination ===\n');

  // Create super agent
  const superAgent = new BaseSuperAgent({
    agentName: 'coordinator',
    agentDescription: 'Coordinates multiple agents for complex tasks',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
    maxTurns: 10,
    failureStrategy: 'skip',
  });

  // Register utility agents
  superAgent.registerUtilityAgent('search', new SearchAgent({
    agentName: 'search',
    agentDescription: 'Web search agent',
  }));

  superAgent.registerUtilityAgent('planner', new PlanningAgent({
    agentName: 'planner',
    agentDescription: 'Task planning agent',
  }));

  // Execute complex task
  const task = 'Search for AI trends and create an implementation plan';
  console.log(`Task: ${task}\n`);

  const result = await superAgent.execute(task);
  console.log('Result:');
  console.log(result);
  console.log('\n');
}

/**
 * Example 2: Full Pipeline with All Agents
 */
async function fullPipeline() {
  console.log('=== Example 2: Full Pipeline with All Agents ===\n');

  const superAgent = new BaseSuperAgent({
    agentName: 'full_coordinator',
    agentDescription: 'Full-featured coordinator',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
    maxTurns: 20,
    parallelExecution: false,
    failureStrategy: 'skip',
  });

  // Register all utility agents
  superAgent.registerUtilityAgent('search', new SearchAgent({
    agentName: 'search',
    agentDescription: 'Search agent',
  }));

  superAgent.registerUtilityAgent('research', new ResearchAgent({
    agentName: 'research',
    agentDescription: 'Research agent',
  }));

  superAgent.registerUtilityAgent('analytics', new AnalyticsAgent({
    agentName: 'analytics',
    agentDescription: 'Analytics agent',
  }));

  superAgent.registerUtilityAgent('planner', new PlanningAgent({
    agentName: 'planner',
    agentDescription: 'Planning agent',
  }));

  // Execute comprehensive task
  const task = 'Research machine learning trends, and create a development plan';
  console.log(`Task: ${task}\n`);

  // Add progress tracking
  superAgent.onProgress((subtaskId, status) => {
    console.log(`[Progress] ${subtaskId}: ${status}`);
  });

  const result = await superAgent.execute(task);
  console.log('\nResult:');
  console.log(result);
  console.log('\n');
}

/**
 * Example 3: Manual Task Decomposition
 */
async function manualDecomposition() {
  console.log('=== Example 3: Manual Task Decomposition ===\n');

  const superAgent = new BaseSuperAgent({
    agentName: 'manual_coordinator',
    agentDescription: 'Manual coordination demo',
    maxTurns: 10,
  });

  superAgent.registerUtilityAgent('search', new SearchAgent({
    agentName: 'search',
    agentDescription: 'Search agent',
  }));

  superAgent.registerUtilityAgent('planner', new PlanningAgent({
    agentName: 'planner',
    agentDescription: 'Planning agent',
  }));

  // Decompose task
  const task = 'Search for TypeScript best practices and plan implementation';
  console.log(`Task: ${task}\n`);

  const subtasks = await superAgent.decomposeTask(task);

  console.log('Decomposed into subtasks:');
  subtasks.forEach((subtask, index) => {
    console.log(`${index + 1}. ${subtask.description}`);
    console.log(`   Agent: ${subtask.agentType}`);
    console.log(`   Dependencies: ${subtask.dependencies.length > 0 ? subtask.dependencies.join(', ') : 'None'}`);
    console.log('');
  });

  // Execute subtasks
  console.log('Executing subtasks...\n');
  const results = await superAgent.executeSubtasks(subtasks);

  // Show individual results
  console.log('Individual Results:');
  results.forEach((result, index) => {
    console.log(`\n${index + 1}. ${result.subtaskId} (${result.status})`);
    if (result.status === 'completed') {
      console.log(result.result.substring(0, 200) + '...');
    } else {
      console.log(`Error: ${result.error}`);
    }
  });

  // Aggregate results
  console.log('\n--- Aggregated Results ---\n');
  const aggregated = superAgent.aggregateResults(results);
  console.log(aggregated);
  console.log('\n');
}

/**
 * Example 4: Failure Handling Strategies
 */
async function failureHandling() {
  console.log('=== Example 4: Failure Handling Strategies ===\n');

  // Strategy 1: Skip failures
  console.log('Strategy 1: Skip failures\n');

  const skipAgent = new BaseSuperAgent({
    agentName: 'skip_coordinator',
    agentDescription: 'Skip failure strategy',
    maxTurns: 5,
    failureStrategy: 'skip',
  });

  skipAgent.registerUtilityAgent('search', new SearchAgent({
    agentName: 'search',
    agentDescription: 'Search agent',
  }));

  const skipResult = await skipAgent.execute('Search for data');
  console.log('Skip strategy result:', skipResult.substring(0, 100) + '...\n');

  // Strategy 2: Retry failures
  console.log('Strategy 2: Retry failures\n');

  const retryAgent = new BaseSuperAgent({
    agentName: 'retry_coordinator',
    agentDescription: 'Retry failure strategy',
    maxTurns: 5,
    failureStrategy: 'retry',
    maxRetries: 3,
  });

  retryAgent.registerUtilityAgent('search', new SearchAgent({
    agentName: 'search',
    agentDescription: 'Search agent',
  }));

  const retryResult = await retryAgent.execute('Search for information');
  console.log('Retry strategy result:', retryResult.substring(0, 100) + '...\n');
}

/**
 * Example 5: Parallel Execution
 */
async function parallelExecution() {
  console.log('=== Example 5: Parallel Execution ===\n');

  const superAgent = new BaseSuperAgent({
    agentName: 'parallel_coordinator',
    agentDescription: 'Parallel execution demo',
    maxTurns: 10,
    parallelExecution: true, // Enable parallel execution
    failureStrategy: 'skip',
  });

  superAgent.registerUtilityAgent('search', new SearchAgent({
    agentName: 'search',
    agentDescription: 'Search agent',
  }));

  superAgent.registerUtilityAgent('planner', new PlanningAgent({
    agentName: 'planner',
    agentDescription: 'Planning agent',
  }));

  // Create subtasks without dependencies (can run in parallel)
  const subtasks = [
    {
      id: 'task-1',
      description: 'Search for AI frameworks',
      agentType: 'search',
      dependencies: [],
    },
    {
      id: 'task-2',
      description: 'Search for machine learning tools',
      agentType: 'search',
      dependencies: [],
    },
    {
      id: 'task-3',
      description: 'Plan development approach',
      agentType: 'planner',
      dependencies: ['task-1', 'task-2'], // Depends on both searches
    },
  ];

  console.log('Executing independent tasks in parallel...\n');

  const startTime = Date.now();
  const results = await superAgent.executeSubtasks(subtasks);
  const duration = Date.now() - startTime;

  console.log(`Completed in ${duration}ms`);
  console.log(`Successful tasks: ${results.filter(r => r.status === 'completed').length}/${results.length}\n`);
}

/**
 * Example 6: Self-Reflection and Quality
 */
async function selfReflection() {
  console.log('=== Example 6: Self-Reflection and Quality ===\n');

  const superAgent = new BaseSuperAgent({
    agentName: 'reflection_coordinator',
    agentDescription: 'Self-reflection demo',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
    maxTurns: 5,
  });

  superAgent.registerUtilityAgent('search', new SearchAgent({
    agentName: 'search',
    agentDescription: 'Search agent',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
  }));

  const task = 'Search for TypeScript resources';
  console.log(`Task: ${task}\n`);

  const result = await superAgent.execute(task);

  // Perform self-reflection
  console.log('Performing self-reflection...\n');
  const reflected = await superAgent.selfReflect(task, result);

  console.log('Reflected Result:');
  console.log(reflected);
  console.log('\n');
}

/**
 * Example 7: Complex Real-World Scenario
 */
async function realWorldScenario() {
  console.log('=== Example 7: Complex Real-World Scenario ===\n');

  const superAgent = new BaseSuperAgent({
    agentName: 'real_world_coordinator',
    agentDescription: 'Real-world task coordinator',
    selfReflection: {
      enabled: true,
      maxAttempts: 2,
    },
    maxTurns: 15,
    parallelExecution: false,
    failureStrategy: 'skip',
    timeout: 60000,
  });

  // Register all agents
  superAgent.registerUtilityAgent('search', new SearchAgent({
    agentName: 'search',
    agentDescription: 'Search agent',
  }));

  superAgent.registerUtilityAgent('research', new ResearchAgent({
    agentName: 'research',
    agentDescription: 'Research agent',
  }));

  superAgent.registerUtilityAgent('planner', new PlanningAgent({
    agentName: 'planner',
    agentDescription: 'Planning agent',
  }));

  // Complex task requiring multiple agents
  const task = `Research current AI safety practices, and create a comprehensive
implementation plan for an enterprise AI safety framework`;

  console.log(`Task: ${task}\n`);

  // Track progress
  let stepCount = 0;
  superAgent.onProgress((subtaskId, status) => {
    stepCount++;
    console.log(`[Step ${stepCount}] ${subtaskId}: ${status}`);
  });

  const result = await superAgent.execute(task);

  console.log('\n--- Final Result ---\n');
  console.log(result);

  // Show statistics
  console.log('\n--- Statistics ---');
  console.log(`Total turns: ${superAgent.getTurnCount()}`);
  console.log(`Registered agents: ${superAgent.getRegisteredAgents().join(', ')}`);
  console.log('\n');
}

/**
 * Main execution
 */
async function main() {
  console.log('BaseSuperAgent Examples\n');
  console.log('Demonstrating multi-agent coordination capabilities\n');
  console.log('='.repeat(60));
  console.log('\n');

  try {
    await basicCoordination();
    await fullPipeline();
    await manualDecomposition();
    await failureHandling();
    await parallelExecution();
    await selfReflection();
    await realWorldScenario();

    console.log('='.repeat(60));
    console.log('\nAll examples completed successfully!');
  } catch (error) {
    console.error('Error running examples:', error);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export {
  basicCoordination,
  fullPipeline,
  manualDecomposition,
  failureHandling,
  parallelExecution,
  selfReflection,
  realWorldScenario,
};
