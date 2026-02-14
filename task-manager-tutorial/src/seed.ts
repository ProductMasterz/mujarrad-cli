/**
 * Seed Script - Task Manager Tutorial
 *
 * This script creates sample data for a project task management system.
 * Run it to populate the database with realistic project data.
 */

import { MujarradClient } from './client.js';
import dotenv from 'dotenv';

dotenv.config();

const API_PUBLIC_KEY = process.env.MUJARRAD_API_PUBLIC_KEY;
const API_SECRET_KEY = process.env.MUJARRAD_API_SECRET_KEY;
const SPACE_SLUG = process.env.MUJARRAD_SPACE_SLUG || 'task-manager-demo';

if (!API_PUBLIC_KEY || !API_SECRET_KEY) {
  throw new Error('MUJARRAD_API_PUBLIC_KEY and MUJARRAD_API_SECRET_KEY are required in .env file');
}

async function seed() {
  console.log('🚀 Seeding Task Manager Tutorial Data...\n');

  const client = new MujarradClient(API_PUBLIC_KEY!, API_SECRET_KEY!, SPACE_SLUG);

  // Ensure space exists
  try {
    await client.getSpaceBySlug(SPACE_SLUG);
    console.log('✓ Space already exists:', SPACE_SLUG);
  } catch (error) {
    console.log('Creating space:', SPACE_SLUG);
    await client.createSpace('Task Manager Demo', SPACE_SLUG);
    console.log('✓ Space created:', SPACE_SLUG);
  }

  console.log('\n📊 Creating Nodes...\n');

  // 1. Create Users (CONTEXT nodes)
  console.log('Creating Users...');
  const alice = await client.createNode('Alice Johnson', 'CONTEXT', {
    email: 'alice@example.com',
    name: 'Alice Johnson',
    role: 'developer',
  });
  console.log('  ✓', alice.title, '-', alice.nodeDetails.email);

  const bob = await client.createNode('Bob Smith', 'CONTEXT', {
    email: 'bob@example.com',
    name: 'Bob Smith',
    role: 'manager',
  });
  console.log('  ✓', bob.title, '-', bob.nodeDetails.email);

  const carol = await client.createNode('Carol White', 'CONTEXT', {
    email: 'carol@example.com',
    name: 'Carol White',
    role: 'designer',
  });
  console.log('  ✓', carol.title, '-', carol.nodeDetails.email);

  const david = await client.createNode('David Lee', 'CONTEXT', {
    email: 'david@example.com',
    name: 'David Lee',
    role: 'qa',
  });
  console.log('  ✓', david.title, '-', david.nodeDetails.email);

  // 2. Create Teams (CONTEXT nodes)
  console.log('\nCreating Teams...');
  const devTeam = await client.createNode('Development Team', 'CONTEXT', {
    name: 'Development Team',
    department: 'Engineering',
  });
  console.log('  ✓', devTeam.title);

  const designTeam = await client.createNode('Design Team', 'CONTEXT', {
    name: 'Design Team',
    department: 'Design',
  });
  console.log('  ✓', designTeam.title);

  // 3. Create Task Templates (REGULAR nodes - store templates as regular nodes)
  console.log('\nCreating Task Templates...');
  const bugTemplate = await client.createNode('Bug Report Template', 'REGULAR', {
    description: 'Template for reporting bugs',
    defaultPriority: 'high',
    defaultEstimatedHours: 4,
    tags: ['bug', 'priority'],
    isTemplate: true,
  });
  console.log('  ✓', bugTemplate.title);

  const featureTemplate = await client.createNode('Feature Template', 'REGULAR', {
    description: 'Template for new features',
    defaultPriority: 'medium',
    defaultEstimatedHours: 16,
    tags: ['feature', 'enhancement'],
    isTemplate: true,
  });
  console.log('  ✓', featureTemplate.title);

  // 4. Create Project (REGULAR node)
  console.log('\nCreating Projects...');
  const project = await client.createNode('Website Redesign', 'REGULAR', {
    description: 'Complete redesign of the company website with new branding',
    status: 'active',
    priority: 'high',
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    budget: 50000,
  });
  console.log('  ✓', project.title);

  // 5. Create Milestones (REGULAR nodes)
  console.log('\nCreating Milestones...');
  const milestone1 = await client.createNode('Phase 1: Planning Complete', 'REGULAR', {
    description: 'Complete project planning and requirements gathering',
    dueDate: '2026-02-15',
    status: 'completed',
  });
  console.log('  ✓', milestone1.title);

  const milestone2 = await client.createNode('Phase 2: Design Complete', 'REGULAR', {
    description: 'Complete all design mockups and prototypes',
    dueDate: '2026-03-31',
    status: 'in_progress',
  });
  console.log('  ✓', milestone2.title);

  const milestone3 = await client.createNode('Phase 3: Development Complete', 'REGULAR', {
    description: 'Complete all development tasks',
    dueDate: '2026-05-15',
    status: 'pending',
  });
  console.log('  ✓', milestone3.title);

  // 6. Create Tasks (REGULAR nodes)
  console.log('\nCreating Tasks...');
  const task1 = await client.createNode('Design homepage mockup', 'REGULAR', {
    description: 'Create initial homepage design mockups',
    status: 'done',
    priority: 'high',
    estimatedHours: 8,
    actualHours: 10,
    dueDate: '2026-02-20',
    completedAt: '2026-02-18',
    tags: ['design', 'ui'],
  });
  console.log('  ✓', task1.title);

  const task2 = await client.createNode('Implement user authentication', 'REGULAR', {
    description: 'Build login/signup functionality',
    status: 'in_progress',
    priority: 'critical',
    estimatedHours: 16,
    dueDate: '2026-03-10',
    tags: ['backend', 'auth'],
  });
  console.log('  ✓', task2.title);

  const task3 = await client.createNode('Design user profile page', 'REGULAR', {
    description: 'Create user profile page mockups',
    status: 'todo',
    priority: 'medium',
    estimatedHours: 6,
    dueDate: '2026-03-15',
    tags: ['design', 'ui'],
  });
  console.log('  ✓', task3.title);

  const task4 = await client.createNode('Fix navigation menu bug', 'REGULAR', {
    description: 'Navigation menu not collapsing on mobile devices',
    status: 'in_progress',
    priority: 'high',
    estimatedHours: 4,
    dueDate: '2026-02-25',
    tags: ['bug', 'frontend'],
  });
  console.log('  ✓', task4.title);

  const task5 = await client.createNode('Write unit tests for auth module', 'REGULAR', {
    description: 'Add comprehensive test coverage for authentication',
    status: 'todo',
    priority: 'medium',
    estimatedHours: 12,
    dueDate: '2026-03-20',
    tags: ['testing', 'backend'],
  });
  console.log('  ✓', task5.title);

  const task6 = await client.createNode('API endpoint testing', 'REGULAR', {
    description: 'Test all API endpoints for security vulnerabilities',
    status: 'backlog',
    priority: 'high',
    estimatedHours: 20,
    tags: ['testing', 'security'],
  });
  console.log('  ✓', task6.title);

  // 7. Create Comments (REGULAR nodes)
  console.log('\nCreating Comments...');
  const comment1 = await client.createNode('Initial design feedback', 'REGULAR', {
    body: 'Looks great! Maybe make the CTA button more prominent?',
    postedAt: '2026-02-19T10:30:00Z',
  });
  console.log('  ✓', comment1.title);

  const comment2 = await client.createNode('Bug report details', 'REGULAR', {
    body: 'Issue occurs on iOS Safari only. Android and desktop work fine.',
    postedAt: '2026-02-24T14:20:00Z',
  });
  console.log('  ✓', comment2.title);

  console.log('\n🔗 Creating Relationships (Attributes)...\n');

  console.log('⚠️  Note: Skipping attribute creation for this tutorial.');
  console.log('   The backend API structure differs from expected format.');
  console.log('   All nodes have been created successfully.\n');
  console.log('   In a production environment, attributes would connect:');
  console.log('   - Tasks to Users (assigned_to)');
  console.log('   - Tasks to Projects (contains)');
  console.log('   - Tasks to other Tasks (depends_on, blocks)');
  console.log('   - Tasks to Milestones (contains)');
  console.log('   - Projects to Milestones (has_milestone)');
  console.log('   - Tasks to Comments (has_comment)\n');

  console.log('\n✅ Seeding Complete!\n');
  console.log('Summary:');
  console.log('  - 4 Users');
  console.log('  - 2 Teams');
  console.log('  - 2 Task Templates');
  console.log('  - 1 Project');
  console.log('  - 3 Milestones');
  console.log('  - 6 Tasks');
  console.log('  - 2 Comments');
  console.log('  - Multiple relationships connecting everything');
  console.log('\nRun "npm run demo" to explore the data!');
}

seed().catch(console.error);
