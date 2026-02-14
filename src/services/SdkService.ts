/**
 * SdkService — SDK project scaffolding and API key management.
 *
 * Follows the pattern from TemplateService.ts.
 */

import axios, { AxiosInstance } from 'axios';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Logger } from '../utils/Logger.js';

export interface SdkServiceConfig {
  apiBaseUrl: string;
  token: string;
}

export interface ApiKeyPair {
  id: string;
  name: string;
  publicKey: string;
  secretKey: string;
}

export interface ScaffoldOptions {
  includeServer?: boolean;
  includeSeed?: boolean;
  includeDemo?: boolean;
  template?: 'basic' | 'task-manager';
}

export interface SpaceInfo {
  id: string;
  name: string;
  slug: string;
}

export class SdkService {
  private client: AxiosInstance;
  private logger: Logger;

  constructor(config: SdkServiceConfig) {
    this.logger = new Logger();
    this.client = axios.create({
      baseURL: config.apiBaseUrl,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.token}`,
      },
      timeout: 30000,
    });
  }

  async ensureSpace(slug: string): Promise<SpaceInfo> {
    try {
      this.logger.info('Looking up space by slug', { slug });
      const response = await this.client.get(`/api/spaces/slug/${slug}`);
      const space = response.data?.data || response.data;
      this.logger.info('Space found', { spaceId: space.id, slug });
      return space;
    } catch (error: any) {
      if (error?.response?.status === 404) {
        this.logger.info('Space not found, creating', { slug });
        const response = await this.client.post('/api/spaces', {
          name: slug,
          slug,
        });
        const space = response.data?.data || response.data;
        this.logger.info('Space created', { spaceId: space.id, slug });
        return space;
      }
      throw error;
    }
  }

  async generateApiKeys(name?: string): Promise<ApiKeyPair> {
    this.logger.info('Generating API keys', { name });
    const response = await this.client.post('/api/api-keys', name ? { name } : {});
    const data = response.data?.data || response.data;
    this.logger.info('API keys generated', { keyId: data.id });
    return data;
  }

  async scaffoldProject(
    projectName: string,
    spaceSlug: string,
    apiKeys: ApiKeyPair,
    options: ScaffoldOptions = {}
  ): Promise<string> {
    const template = options.template || 'basic';
    this.logger.info('Scaffolding project', { projectName, template, options });

    if (template === 'task-manager') {
      return this.scaffoldTaskManager(projectName, spaceSlug, apiKeys, options);
    } else {
      return this.scaffoldBasicProject(projectName, spaceSlug, apiKeys, options);
    }
  }

  private async scaffoldBasicProject(
    projectName: string,
    spaceSlug: string,
    apiKeys: ApiKeyPair,
    _options: ScaffoldOptions
  ): Promise<string> {
    const projectDir = path.resolve(projectName);

    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });

    const packageJson = {
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'npx tsx src/index.ts',
        build: 'tsc',
      },
      dependencies: {
        '@mujarrad/sdk': '^0.1.0-alpha.1',
      },
      devDependencies: {
        typescript: '^5.3.0',
        tsx: '^4.7.0',
      },
    };

    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
        outDir: './dist',
        rootDir: './src',
        declaration: true,
        skipLibCheck: true,
      },
      include: ['src/**/*'],
    };

    const envContent = `MUJARRAD_PUBLIC_KEY=${apiKeys.publicKey}
MUJARRAD_SECRET_KEY=${apiKeys.secretKey}
MUJARRAD_SPACE=${spaceSlug}`;

    const gitignoreContent = `node_modules/
dist/
.env
*.js
*.d.ts
*.js.map`;

    const indexTs = `import { Mujarrad } from '@mujarrad/sdk';
import { schema } from './schema.js';

const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_PUBLIC_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: process.env.MUJARRAD_SPACE!,
}).withSchema(schema);

async function main() {
  const node = await client.createEntity('Task', {
    title: 'My First Task',
    status: 'todo',
  });

  console.log('Created node:', node.id);

  const nodes = await client.nodes.list();
  console.log('Total nodes:', nodes.length);
}

main().catch(console.error);
`;

    const schemaTs = `import { defineSchema } from '@mujarrad/sdk';

export const schema = defineSchema()
  .entity('Task')
    .string('title', { required: true })
    .enum('status', ['todo', 'in_progress', 'done'])
    .string('description')
    .done()
  .entity('Note')
    .string('title', { required: true })
    .string('content')
    .done()
  .relationship('task_notes', {
    source: 'Task',
    target: 'Note',
    verb: 'contains',
  })
  .build();
`;

    const readmeContent = `# ${projectName}

Built with [Mujarrad SDK](https://www.mujarrad.com) — graph-based data platform.

## Setup

npm install

## Run

npm start

## Configuration

API keys are stored in .env. Never commit this file.

## Learn More

- [Mujarrad Documentation](https://docs.mujarrad.com)
- [SDK Reference](https://github.com/mujarrad/mujarrad-cli/tree/main/packages/sdk)
`;

    await Promise.all([
      fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2)),
      fs.writeFile(path.join(projectDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2)),
      fs.writeFile(path.join(projectDir, '.env'), envContent),
      fs.writeFile(path.join(projectDir, '.gitignore'), gitignoreContent),
      fs.writeFile(path.join(projectDir, 'src', 'index.ts'), indexTs),
      fs.writeFile(path.join(projectDir, 'src', 'schema.ts'), schemaTs),
      fs.writeFile(path.join(projectDir, 'README.md'), readmeContent),
    ]);

    this.logger.info('Basic project scaffolded', { projectDir });
    return projectDir;
  }

  private async scaffoldTaskManager(
    projectName: string,
    spaceSlug: string,
    apiKeys: ApiKeyPair,
    options: ScaffoldOptions
  ): Promise<string> {
    const projectDir = path.resolve(projectName);

    await fs.mkdir(path.join(projectDir, 'src'), { recursive: true });
    await fs.mkdir(path.join(projectDir, 'public'), { recursive: true });

    const packageJson = {
      name: projectName,
      version: '1.0.0',
      type: 'module',
      scripts: {
        start: 'tsx server.ts',
        seed: 'npx tsx src/seed.ts',
        demo: 'npx tsx src/demo.ts',
      },
      dependencies: {
        '@mujarrad/sdk': '^0.1.0-alpha.1',
        express: '^4.18.2',
        cors: '^2.8.5',
        dotenv: '^16.4.5',
        axios: '^1.12.2',
      },
      devDependencies: {
        typescript: '^5.3.0',
        tsx: '^4.7.0',
        '@types/express': '^4.17.21',
        '@types/cors': '^2.8.17',
        '@types/node': '^20.11.20',
      },
    };

    const tsconfig = {
      compilerOptions: {
        target: 'ES2022',
        module: 'ES2022',
        moduleResolution: 'node',
        esModuleInterop: true,
        strict: true,
        outDir: './dist',
        rootDir: './',
        skipLibCheck: true,
      },
      include: ['src/**/*', '*.ts'],
    };

    const envContent = `MUJARRAD_API_PUBLIC_KEY=${apiKeys.publicKey}
MUJARRAD_API_SECRET_KEY=${apiKeys.secretKey}
MUJARRAD_SPACE_SLUG=${spaceSlug}

PORT=3000`;

    const envExample = `# Mujarrad API Configuration
MUJARRAD_API_PUBLIC_KEY=your_public_key_here
MUJARRAD_API_SECRET_KEY=your_secret_key_here
MUJARRAD_SPACE_SLUG=your_space_slug_here

# Server Configuration
PORT=3000`;

    const gitignoreContent = `node_modules/
dist/
.env
*.js
*.d.ts
*.js.map`;

    await Promise.all([
      fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2)),
      fs.writeFile(path.join(projectDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2)),
      fs.writeFile(path.join(projectDir, '.env'), envContent),
      fs.writeFile(path.join(projectDir, '.env.example'), envExample),
      fs.writeFile(path.join(projectDir, '.gitignore'), gitignoreContent),
    ]);

    await fs.copyFile(
      '/Users/omarhamdy/Developer/mujarrad-cli/task-manager-tutorial/server.ts',
      path.join(projectDir, 'server.ts')
    );
    await fs.copyFile(
      '/Users/omarhamdy/Developer/mujarrad-cli/task-manager-tutorial/src/client.ts',
      path.join(projectDir, 'src/client.ts')
    );
    await fs.copyFile(
      '/Users/omarhamdy/Developer/mujarrad-cli/task-manager-tutorial/src/schema.ts',
      path.join(projectDir, 'src/schema.ts')
    );

    if (options.includeSeed !== false) {
      await fs.copyFile(
        '/Users/omarhamdy/Developer/mujarrad-cli/task-manager-tutorial/src/seed.ts',
        path.join(projectDir, 'src/seed.ts')
      );
    }

    if (options.includeDemo !== false) {
      await fs.copyFile(
        '/Users/omarhamdy/Developer/mujarrad-cli/task-manager-tutorial/src/demo.ts',
        path.join(projectDir, 'src/demo.ts')
      );
    }

    await fs.copyFile(
      '/Users/omarhamdy/Developer/mujarrad-cli/task-manager-tutorial/public/index.html',
      path.join(projectDir, 'public/index.html')
    );
    await fs.copyFile(
      '/Users/omarhamdy/Developer/mujarrad-cli/task-manager-tutorial/public/debug.html',
      path.join(projectDir, 'public/debug.html')
    );
    await fs.copyFile(
      '/Users/omarhamdy/Developer/mujarrad-cli/task-manager-tutorial/public/check_browser.html',
      path.join(projectDir, 'public/check_browser.html')
    );

    await fs.writeFile(path.join(projectDir, 'README.md'), this.generateTaskManagerReadme(projectName));

    this.logger.info('Task manager project scaffolded', { projectDir });
    return projectDir;
  }

  private generateTaskManagerReadme(projectName: string): string {
    return `# ${projectName}

A comprehensive task management system built with [Mujarrad SDK](https://www.mujarrad.com).

## 🚀 Getting Started

### Installation

npm install

### Configuration

API keys are already configured in the .env file.

### Running

Option 1: CLI Commands
npm run seed
npm run demo

Option 2: Web Dashboard
npm start
# Open: http://localhost:3000

## 📚 Learn More

- [Mujarrad Documentation](https://docs.mujarrad.com)
- [SDK Reference](https://github.com/mujarrad/mujarrad-cli/tree/main/packages/sdk)
`;
  }
}
