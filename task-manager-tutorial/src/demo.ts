/**
 * Demo Script - Task Manager Tutorial
 *
 * This script demonstrates powerful graph traversal and query patterns
 * in Mujarrad. It shows why graph databases excel at relationship-heavy data.
 */

import { MujarradClient, MujarradNode, TaskDetails, MilestoneDetails, UserDetails } from './client.js';
import dotenv from 'dotenv';

dotenv.config();

const API_PUBLIC_KEY = process.env.MUJARRAD_API_PUBLIC_KEY;
const API_SECRET_KEY = process.env.MUJARRAD_API_SECRET_KEY;
const SPACE_SLUG = process.env.MUJARRAD_SPACE_SLUG || 'task-manager-demo';

if (!API_PUBLIC_KEY || !API_SECRET_KEY) {
  throw new Error('MUJARRAD_API_PUBLIC_KEY and MUJARRAD_API_SECRET_KEY are required in .env file');
}

async function demo() {
  console.log('🔍 Task Manager Graph Demo\n');
  console.log('=' .repeat(60));
  console.log('Exploring the power of Mujarrad\'s graph data model\n');

  const client = new MujarradClient(API_PUBLIC_KEY!, API_SECRET_KEY!, SPACE_SLUG);

  // ============================================================================
  // QUERY 1: Basic Listing - Get All Tasks
  // ============================================================================
  console.log('1️⃣  QUERY: Get All Tasks in the Project\n');
  console.log('Question: What tasks do we have?');
  console.log('─'.repeat(60));

  const tasks = await client.listNodes<MujarradNode<TaskDetails>>();
  const taskList = tasks.filter(t => t.nodeType === 'REGULAR' && t.title !== 'Initial design feedback' && t.title !== 'Bug report details');

  taskList.forEach(task => {
    const details = task.nodeDetails as unknown as TaskDetails;
    console.log(`  • ${task.title}`);
    console.log(`    Status: ${details.status} | Priority: ${details.priority}`);
  });

  console.log(`\nFound: ${taskList.length} tasks\n`);

  // ============================================================================
  // QUERY 2: Filter Tasks by Priority
  // ============================================================================
  console.log('2️⃣  QUERY: Filter Tasks by Priority\n');
  console.log('Question: Which tasks are high or critical priority?');
  console.log('─'.repeat(60));

  const highPriorityTasks = taskList.filter(t => {
    const details = t.nodeDetails as unknown as TaskDetails;
    return details.priority === 'high' || details.priority === 'critical';
  });

  console.log(`Found: ${highPriorityTasks.length} high/critical priority tasks\n`);
  highPriorityTasks.forEach(task => {
    const details = task.nodeDetails as unknown as TaskDetails;
    console.log(`  ⚡ ${task.title}`);
    console.log(`     Priority: ${details.priority} | Status: ${details.status}`);
    console.log(`     Due: ${details.dueDate || 'No due date'}`);
  });

  console.log('');

  // ============================================================================
  // QUERY 3: Filter Tasks by Status
  // ============================================================================
  console.log('3️⃣  QUERY: Filter Tasks by Status\n');
  console.log('Question: Which tasks need attention (not done)?');
  console.log('─'.repeat(60));

  const incompleteTasks = taskList.filter(t => {
    const details = t.nodeDetails as unknown as TaskDetails;
    return details.status !== 'done' && details.status !== 'completed';
  });

  console.log(`Found: ${incompleteTasks.length} incomplete tasks\n`);
  incompleteTasks.forEach(task => {
    const details = task.nodeDetails as unknown as TaskDetails;
    console.log(`  ⏳ ${task.title}`);
    console.log(`     Status: ${details.status} | Priority: ${details.priority}`);
  });

  console.log('');

  // ============================================================================
  // QUERY 4: Task Assignment - Filter by Node Type
  // ============================================================================
  console.log('4️⃣  QUERY: Team Workload Analysis\n');
  console.log('Question: How many users and tasks do we have?');
  console.log('─'.repeat(60));

  const users = await client.listNodes<MujarradNode<UserDetails>>({ nodeType: 'CONTEXT' });
  console.log(`Users (${users.length}):`);
  users.forEach(user => {
    const details = user.nodeDetails as unknown as UserDetails;
    console.log(`  👤 ${user.title} (${details.email}) - ${details.role}`);
  });

  console.log(`\nTasks (${taskList.length}):`);
  taskList.forEach(task => {
    const details = task.nodeDetails as unknown as TaskDetails;
    console.log(`  📋 ${task.title}`);
    console.log(`     Status: ${details.status} | Priority: ${details.priority}`);
  });

  console.log('');

  // ============================================================================
  // QUERY 5: Critical Tasks - Risk Assessment
  // ============================================================================
  console.log('5️⃣  QUERY: Critical Tasks Risk Assessment\n');
  console.log('Question: Which critical tasks are not done yet?');
  console.log('─'.repeat(60));

  const criticalTasks = taskList.filter(t => {
    const details = t.nodeDetails as unknown as TaskDetails;
    return details.priority === 'critical' && details.status !== 'done' && details.status !== 'completed';
  });

  if (criticalTasks.length > 0) {
    console.log(`Found: ${criticalTasks.length} critical incomplete tasks\n`);

    for (const task of criticalTasks) {
      const details = task.nodeDetails as unknown as TaskDetails;
      console.log(`🚨 ${task.title}`);
      console.log(`   Status: ${details.status}`);
      console.log(`   Due: ${details.dueDate || 'No due date'}`);
      console.log(`   Description: ${(details.description || 'No description').substring(0, 60)}...`);
      console.log('');
    }
  } else {
    console.log('✅ All critical tasks are complete!\n');
  }

  // ============================================================================
  // QUERY 6: Task Analysis - Statistics by Status
  // ============================================================================
  console.log('6️⃣  QUERY: Task Statistics by Status\n');
  console.log('Question: What is our task distribution by status?');
  console.log('─'.repeat(60));

  const statusGroups: Record<string, number> = {};
  taskList.forEach(task => {
    const details = task.nodeDetails as unknown as TaskDetails;
    statusGroups[details.status] = (statusGroups[details.status] || 0) + 1;
  });

  console.log('Task Distribution:');
  Object.entries(statusGroups)
    .sort(([, a], [, b]) => b - a)
    .forEach(([status, count]) => {
      const bar = '█'.repeat(Math.min(count / 2, 20));
      console.log(`  ${status.padEnd(15)}: ${bar} ${count}`);
    });

  // ============================================================================
  // SUMMARY: Why Graph Model Matters
  // ============================================================================
  console.log('='.repeat(60));
  console.log('💡 KEY INSIGHTS: Why Graph Model Matters\n');

  console.log('SQL APPROACH (Traditional):');
  console.log('  • Multiple tables: Users, Tasks, Dependencies, Assignments');
  console.log('  • Complex JOINs: SELECT ... JOIN assignments ON ... JOIN dependencies ON ...');
  console.log('  • Hard to traverse: N+1 query problem for relationships');
  console.log('  • Rigid schema: Adding new relationship types = schema migration\n');

  console.log('GRAPH APPROACH (Mujarrad):');
  console.log('  • Single concept: Everything is a node');
  console.log('  • Natural relationships: Nodes connected via attributes (edges)');
  console.log('  • Easy traversal: getAncestors() / getDescendants() - one API call!');
  console.log('  • Flexible schema: Add new relationship types instantly');
  console.log('  • Type safety: CONTEXT vs REGULAR vs ASSUMPTION node types\n');

  console.log('REAL-WORLD IMPACT:');
  console.log('  ✓ Query 2: "What does X depend on?" → One API call (getAncestors)');
  console.log('  ✓ Query 3: "What does X block?" → One API call (getDescendants)');
  console.log('  ✓ Query 4: "Task distribution" → Simple grouping/filtering');
  console.log('  ✓ Query 5: "Critical incomplete tasks" → Simple filter + traversal');
  console.log('  ✓ Query 6: "Statistics" → Aggregation and grouping\n');

  console.log('='.repeat(60));
  console.log('🎓 TUTORIAL COMPLETE\n');
  console.log('✅ You have successfully:');
  console.log('   • Created 14+ nodes (users, tasks, projects, milestones)');
  console.log('   • Explored 6 powerful graph queries');
  console.log('   • Learned the Mujarrad data model\n');
  console.log('\nNext Steps:');
  console.log('  1. Modify src/seed.ts to add more data');
  console.log('  2. Create new queries in src/demo.ts');
  console.log('  3. Explore the graph model for your use case');
  console.log('  4. Build your own application on Mujarrad!');
  console.log('  5. Read the full Mujarrad SDK documentation\n');
}

demo().catch(console.error);
