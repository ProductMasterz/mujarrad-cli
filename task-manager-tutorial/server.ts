/**
 * Express Server for Task Manager Tutorial
 *
 * Provides API endpoints and serves static dashboard
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import dotenv from 'dotenv';

interface MujarradNode<T = any> {
  id: string;
  title: string;
  nodeType: string;
  nodeDetails: T;
  createdAt: string;
  updatedAt: string;
}

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

// Server-side cache for dashboard data
interface CacheData {
  data: any;
  timestamp: number;
}

let dashboardCache: CacheData | null = null;
const CACHE_TTL = 30000; // 30 seconds cache

// Mujarrad configuration
const MUJARRAD_CONFIG = {
  apiPublicKey: process.env.MUJARRAD_API_PUBLIC_KEY,
  apiSecretKey: process.env.MUJARRAD_API_SECRET_KEY,
  spaceSlug: process.env.MUJARRAD_SPACE_SLUG || 'task-manager-demo',
};

// Validate required configuration
if (!MUJARRAD_CONFIG.apiPublicKey || !MUJARRAD_CONFIG.apiSecretKey) {
  throw new Error('MUJARRAD_API_PUBLIC_KEY and MUJARRAD_API_SECRET_KEY are required in .env file');
}

console.log('Using API Key authentication');
console.log(`Space: ${MUJARRAD_CONFIG.spaceSlug}`);

/**
 * Mujarrad Client with API Key authentication
 */
class MujarradClient {
  private readonly spaceSlug: string;
  private readonly apiPublicKey: string;
  private readonly apiSecretKey: string;

  constructor(apiPublicKey: string, apiSecretKey: string, spaceSlug: string) {
    this.apiPublicKey = apiPublicKey;
    this.apiSecretKey = apiSecretKey;
    this.spaceSlug = spaceSlug;
  }

  /**
   * Get headers for API requests using API Keys
   */
  getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'X-API-Key': this.apiPublicKey,
      'X-API-Secret': this.apiSecretKey,
    };
  }

  /**
   * List nodes from Mujarrad API
   */
  async listNodes(filters?: { nodeType?: string }): Promise<any[]> {
    const params = new URLSearchParams();
    if (filters?.nodeType) params.append('nodeType', filters.nodeType);

    const response = await fetch(
      `https://mujarrad.onrender.com/api/spaces/${this.spaceSlug}/nodes?${params.toString()}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error('API request failed:', response.status, response.statusText, errorBody);
      throw new Error(`Mujarrad API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  /**
   * Get single node by ID
   */
  async getNode(nodeId: string): Promise<any> {
    const response = await fetch(
      `https://mujarrad.onrender.com/api/spaces/${this.spaceSlug}/nodes/${nodeId}`,
      {
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Mujarrad API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  /**
   * Create a new node
   */
  async createNode<T>(
    title: string,
    nodeType: string,
    nodeDetails: T
  ): Promise<MujarradNode<T>> {
    const response = await fetch(
      `https://mujarrad.onrender.com/api/spaces/${this.spaceSlug}/nodes`,
      {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          title,
          nodeType,
          nodeDetails,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Mujarrad API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  /**
   * Update an existing node
   */
  async updateNode(nodeId: string, updates: any): Promise<any> {
    const response = await fetch(
      `https://mujarrad.onrender.com/api/spaces/${this.spaceSlug}/nodes/${nodeId}`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(updates),
      }
    );

    if (!response.ok) {
      throw new Error(`Mujarrad API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return result.data || result;
  }

  /**
   * Delete a node
   */
  async deleteNode(nodeId: string): Promise<void> {
    const response = await fetch(
      `https://mujarrad.onrender.com/api/spaces/${this.spaceSlug}/nodes/${nodeId}`,
      {
        method: 'DELETE',
        headers: this.getHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error(`Mujarrad API error: ${response.status} ${response.statusText}`);
    }
  }
}

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Routes

/**
 * GET /api/dashboard
 * Single optimized endpoint that returns all dashboard data
 * Uses server-side caching to avoid repeated API calls
 */
app.get('/api/dashboard', async (req, res) => {
  try {
    const now = Date.now();

    // Return cached data if still valid
    if (dashboardCache && (now - dashboardCache.timestamp) < CACHE_TTL) {
      return res.json(dashboardCache.data);
    }

    // Fetch fresh data from Mujarrad API
    const client = new MujarradClient(
      MUJARRAD_CONFIG.apiPublicKey!,
      MUJARRAD_CONFIG.apiSecretKey!,
      MUJARRAD_CONFIG.spaceSlug
    );

    const nodes = await client.listNodes();

    // Filter tasks
    const tasks = Array.isArray(nodes) ? nodes.filter(n =>
      n.nodeType === 'REGULAR' &&
      n.title &&
      !n.title.includes('Template') &&
      !n.title.includes('Phase') &&
      n.title !== 'Website Redesign'
    ) : [];

    // Filter users
    const users = Array.isArray(nodes) ? nodes.filter(n =>
      n.nodeType === 'CONTEXT' &&
      n.title &&
      (n.nodeDetails?.email || '').includes('@') &&
      !n.title.includes('Team')
    ) : [];

    // Calculate statistics
    const highPriority = tasks.filter(t =>
      t.nodeDetails?.priority === 'high' || t.nodeDetails?.priority === 'critical'
    ).length;
    const inProgress = tasks.filter(t => t.nodeDetails?.status === 'in_progress').length;
    const completed = tasks.filter(t => t.nodeDetails?.status === 'done').length;
    const backlog = tasks.filter(t => t.nodeDetails?.status === 'backlog').length;

    // Count unique projects from task project fields
    const projectNames = new Set<string>();
    tasks.forEach(t => {
      if (t.nodeDetails?.project) projectNames.add(t.nodeDetails.project);
    });
    const totalProjects = projectNames.size || 1;

    // Build response
    const responseData = {
      success: true,
      data: {
        nodes: nodes || [],
        tasks,
        users,
        stats: {
          totalTasks: tasks.length,
          totalUsers: users.length,
          totalProjects,
          highPriorityTasks: highPriority,
          inProgressTasks: inProgress,
          completedTasks: completed,
          backlogTasks: backlog,
          completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
        },
      },
    };

    // Cache the response
    dashboardCache = {
      data: responseData,
      timestamp: now,
    };

    res.json(responseData);
  } catch (error: any) {
    console.error('Error fetching dashboard data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/data
 * Returns all nodes and tasks
 */
app.get('/api/data', async (req, res) => {
  try {
    const client = new MujarradClient(
      MUJARRAD_CONFIG.email!,
      MUJARRAD_CONFIG.password!,
      MUJARRAD_CONFIG.spaceSlug
    );

    const nodes = await client.listNodes();

    // Filter tasks - ensure nodes is an array
    const tasks = Array.isArray(nodes) ? nodes.filter(n =>
      n.nodeType === 'REGULAR' &&
      n.title &&
      !n.title.includes('Template') &&
      !n.title.includes('Phase') &&
      n.title !== 'Website Redesign'
    ) : [];

    res.json({
      success: true,
      data: {
        nodes: nodes || [],
        tasks,
      },
    });
  } catch (error: any) {
    console.error('Error fetching data:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/users
 * Returns all users
 */
app.get('/api/users', async (req, res) => {
  try {
    const client = new MujarradClient(
      MUJARRAD_CONFIG.email!,
      MUJARRAD_CONFIG.password!,
      MUJARRAD_CONFIG.spaceSlug
    );

    const users = await client.listNodes({ nodeType: 'CONTEXT' });
    const teamMembers = users.filter(u =>
      u.title &&
      (u.nodeDetails?.email || '').includes('@') &&
      !u.title.includes('Team')
    );

    res.json({
      success: true,
      data: teamMembers,
    });
  } catch (error: any) {
    console.error('Error fetching users:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/stats
 * Returns dashboard statistics
 */
app.get('/api/stats', async (req, res) => {
  try {
    const client = new MujarradClient(
      MUJARRAD_CONFIG.email!,
      MUJARRAD_CONFIG.password!,
      MUJARRAD_CONFIG.spaceSlug
    );

    const nodes = await client.listNodes();
    const tasks = nodes.filter(n => n.nodeType === 'REGULAR' && n.title);
    const users = nodes.filter(n => n.nodeType === 'CONTEXT' && n.title && !n.title.includes('Team'));

    const highPriority = tasks.filter(t =>
      t.nodeDetails?.priority === 'high' || t.nodeDetails?.priority === 'critical'
    ).length;
    const inProgress = tasks.filter(t => t.nodeDetails?.status === 'in_progress').length;
    const completed = tasks.filter(t => t.nodeDetails?.status === 'done').length;
    const backlog = tasks.filter(t => t.nodeDetails?.status === 'backlog').length;

    res.json({
      success: true,
      data: {
        totalNodes: nodes.length,
        totalTasks: tasks.length,
        totalUsers: users.length,
        highPriorityTasks: highPriority,
        inProgressTasks: inProgress,
        completedTasks: completed,
        backlogTasks: backlog,
        // Calculate completion percentage
        completionRate: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      },
    });
  } catch (error: any) {
    console.error('Error fetching stats:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/run-seed
 * Runs the seed script to populate data
 */
app.post('/api/run-seed', async (req, res) => {
  try {
    console.log('Running seed script...');
    exec('npm run seed', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('Seed error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.log('Seed completed:', stdout);
      res.json({
        success: true,
        message: 'Seed completed successfully',
        output: stdout,
      });
    });
  } catch (error: any) {
    console.error('Error running seed:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/tasks
 * Create a new task
 */
app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, status, priority, dueDate } = req.body;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: 'Title is required',
      });
    }

    const client = new MujarradClient(
      MUJARRAD_CONFIG.email!,
      MUJARRAD_CONFIG.password!,
      MUJARRAD_CONFIG.spaceSlug
    );

    const nodeDetails: any = {
      title,
    };

    if (description) nodeDetails.description = description;
    if (status) nodeDetails.status = status;
    if (priority) nodeDetails.priority = priority;
    if (dueDate) nodeDetails.dueDate = dueDate;

    const node = await client.createNode(title, 'REGULAR', nodeDetails);

    // Invalidate cache
    dashboardCache = null;

    res.json({
      success: true,
      data: node,
    });
  } catch (error: any) {
    console.error('Error creating task:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * PUT /api/tasks/:id
 * Update task (status, priority, etc.)
 */
app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, priority, assignee } = req.body;

    if (!status && !priority && !assignee) {
      return res.status(400).json({
        success: false,
        error: 'At least one field (status, priority, or assignee) is required',
      });
    }

    const client = new MujarradClient(
      MUJARRAD_CONFIG.email!,
      MUJARRAD_CONFIG.password!,
      MUJARRAD_CONFIG.spaceSlug
    );

    const existingNode = await client.getNode(id);

    // Build update object
    const updates: any = {
      nodeDetails: {
        ...existingNode.nodeDetails,
      },
    };

    if (status) updates.nodeDetails.status = status;
    if (priority) updates.nodeDetails.priority = priority;
    if (assignee) updates.nodeDetails.assignee = assignee;

    const node = await client.updateNode(id, updates);

    // Invalidate cache
    dashboardCache = null;

    res.json({
      success: true,
      data: node,
    });
  } catch (error: any) {
    console.error('Error updating task:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/tasks/:id
 * Delete a task
 */
app.delete('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = new MujarradClient(
      MUJARRAD_CONFIG.email!,
      MUJARRAD_CONFIG.password!,
      MUJARRAD_CONFIG.spaceSlug
    );

    await client.deleteNode(id);

    // Invalidate cache
    dashboardCache = null;

    res.json({
      success: true,
      message: 'Task deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting task:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/users
 * Create a new user
 */
app.post('/api/users', async (req, res) => {
  try {
    const { name, email, role } = req.body;

    if (!name || !email || !role) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and role are required',
      });
    }

    const client = new MujarradClient(
      MUJARRAD_CONFIG.email!,
      MUJARRAD_CONFIG.password!,
      MUJARRAD_CONFIG.spaceSlug
    );

    const node = await client.createNode(name, 'CONTEXT', {
      name,
      email,
      role,
    });

    // Invalidate cache
    dashboardCache = null;

    res.json({
      success: true,
      data: node,
    });
  } catch (error: any) {
    console.error('Error creating user:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * DELETE /api/users/:id
 * Delete a user
 */
app.delete('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const client = new MujarradClient(
      MUJARRAD_CONFIG.email!,
      MUJARRAD_CONFIG.password!,
      MUJARRAD_CONFIG.spaceSlug
    );

    await client.deleteNode(id);

    // Invalidate cache
    dashboardCache = null;

    res.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting user:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/run-demo
 * Runs demo script
 */
app.post('/api/run-demo', async (req, res) => {
  try {
    console.log('Running demo script...');
    exec('npm run demo', { cwd: __dirname }, (error, stdout, stderr) => {
      if (error) {
        console.error('Demo error:', error);
        res.status(500).json({
          success: false,
          error: error.message,
        });
        return;
      }

      console.log('Demo completed');
      res.json({
        success: true,
        message: 'Demo completed',
        output: stdout,
      });
    });
  } catch (error: any) {
    console.error('Error running demo:', error.message);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/health
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════╗
║                                               ║
║     🚀 Task Manager Server Started              ║
║                                               ║
║     Port: ${PORT}                                ║
║     URL:  http://localhost:${PORT}                ║
║                                               ║
╚══════════════════════════════════════════╝

  Dashboard: http://localhost:${PORT}
  API Docs:  http://localhost:${PORT}/api/health
`);
});