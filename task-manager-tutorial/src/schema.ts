/**
 * Task Manager Schema
 *
 * This file demonstrates how to define a data model for a project task management system
 * using Mujarrad's graph-based approach.
 *
 * CONCEPT: Everything is a node, relationships are attributes
 *
 * NODE TYPES:
 * - CONTEXT: Identity nodes (Users, Teams)
 * - REGULAR: Data nodes (Projects, Tasks, Milestones, Comments, Templates)
 * - ASSUMPTION: Hypotheses or draft data
 *
 * Note: TEMPLATE nodes are stored as REGULAR nodes with an isTemplate flag
 *       The backend API supports: ASSUMPTION, REGULAR, CONTEXT, ATTRIBUTE
 *
 * RELATIONSHIPS (Attributes):
 * - Project contains Task
 * - User assigned_to Task
 * - Task depends_on Task
 * - Project has_milestone Milestone
 * - Milestone contains Task
 * - Task has_comment Comment
 */

export const SCHEMA = {
  entities: {
    User: {
      nodeType: 'CONTEXT',
      fields: {
        email: { type: 'string', required: true },
        name: { type: 'string', required: true },
        role: { type: 'enum', values: ['admin', 'manager', 'developer', 'designer', 'qa'] },
        avatarUrl: { type: 'string' },
      },
    },

    Team: {
      nodeType: 'CONTEXT',
      fields: {
        name: { type: 'string', required: true },
        department: { type: 'string' },
      },
    },

    Project: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['planning', 'active', 'on_hold', 'completed', 'cancelled'] },
        priority: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
        startDate: { type: 'date' },
        endDate: { type: 'date' },
        budget: { type: 'number' },
      },
    },

    Task: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        status: { type: 'enum', values: ['backlog', 'todo', 'in_progress', 'in_review', 'done', 'blocked'] },
        priority: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
        estimatedHours: { type: 'number' },
        actualHours: { type: 'number' },
        dueDate: { type: 'date' },
        completedAt: { type: 'date' },
        tags: { type: 'json' },
      },
    },

    Milestone: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        dueDate: { type: 'date', required: true },
        status: { type: 'enum', values: ['pending', 'in_progress', 'completed', 'overdue'] },
      },
    },

    Comment: {
      nodeType: 'REGULAR',
      fields: {
        body: { type: 'string', required: true },
        postedAt: { type: 'date', required: true },
      },
    },

    TaskTemplate: {
      nodeType: 'REGULAR',
      fields: {
        description: { type: 'string' },
        defaultPriority: { type: 'enum', values: ['low', 'medium', 'high', 'critical'] },
        defaultEstimatedHours: { type: 'number' },
        tags: { type: 'json' },
        isTemplate: { type: 'boolean' },
      },
    },
  },

  relationships: {
    team_members: {
      source: 'Team',
      target: 'User',
      verb: 'has_member',
    },
    project_owner: {
      source: 'Project',
      target: 'User',
      verb: 'owned_by',
    },
    project_tasks: {
      source: 'Project',
      target: 'Task',
      verb: 'contains',
    },
    task_assignee: {
      source: 'Task',
      target: 'User',
      verb: 'assigned_to',
    },
    task_dependencies: {
      source: 'Task',
      target: 'Task',
      verb: 'depends_on',
    },
    task_blocking: {
      source: 'Task',
      target: 'Task',
      verb: 'blocks',
    },
    project_milestones: {
      source: 'Project',
      target: 'Milestone',
      verb: 'has_milestone',
    },
    milestone_tasks: {
      source: 'Milestone',
      target: 'Task',
      verb: 'contains',
    },
    task_comments: {
      source: 'Task',
      target: 'Comment',
      verb: 'has_comment',
    },
    task_from_template: {
      source: 'Task',
      target: 'TaskTemplate',
      verb: 'created_from',
    },
  },
};

/**
 * EXPLANATION: Why a Graph Model?
 *
 * In traditional SQL databases:
 * - Projects table, Tasks table, TaskDependencies table, Assignments table
 * - Complex JOINs to get: "All tasks assigned to user X in project Y that depend on task Z"
 * - Queries become: SELECT * FROM tasks JOIN assignments ON ... JOIN dependencies ON ...
 *
 * In Mujarrad's Graph:
 * - Single hop traversal: User <-assigned_to- Task <-depends_on- Task
 * - Natural modeling: "User is assigned to Task, Task depends on another Task"
 * - Simple API calls: client.getAncestors(taskId) to get all dependencies
 *
 * REAL-WORLD EXAMPLE:
 * "Show me all critical tasks assigned to Alice in the 'Website Redesign' project"
 *
 * SQL Approach:
 *   SELECT t.* FROM tasks t
 *   JOIN assignments a ON t.id = a.task_id
 *   JOIN projects p ON t.project_id = p.id
 *   WHERE p.name = 'Website Redesign'
 *     AND a.user_id = (SELECT id FROM users WHERE name = 'Alice')
 *     AND t.priority = 'critical';
 *
 * Graph Approach:
 *   project = client.nodes.list({ title: 'Website Redesign' })[0];
 *   alice = client.nodes.list({ title: 'Alice' })[0];
 *   tasks = client.getDescendants(project.id);  // All tasks in project
 *   filtered = tasks.filter(t =>
 *     t.nodeDetails.priority === 'critical' &&
 *     t.attributes.some(a => a.attributeName === 'assigned_to' && a.targetNodeId === alice.id)
 *   );
 */
