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
    apiKeys: ApiKeyPair
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

    const envContent = [
      `MUJARRAD_PUBLIC_KEY=${apiKeys.publicKey}`,
      `MUJARRAD_SECRET_KEY=${apiKeys.secretKey}`,
      `MUJARRAD_SPACE=${spaceSlug}`,
    ].join('\n');

    const gitignoreContent = [
      'node_modules/',
      'dist/',
      '.env',
      '*.js',
      '*.d.ts',
      '*.js.map',
    ].join('\n');

    const indexTs = `import { Mujarrad } from '@mujarrad/sdk';
import { schema } from './schema.js';

// Initialize the Mujarrad client
const client = new Mujarrad({
  apiKey: process.env.MUJARRAD_PUBLIC_KEY!,
  secretKey: process.env.MUJARRAD_SECRET_KEY!,
  space: process.env.MUJARRAD_SPACE!,
}).withSchema(schema);

async function main() {
  // Create a node
  const node = await client.createEntity('Task', {
    title: 'My First Task',
    status: 'todo',
  });

  console.log('Created node:', node.id);

  // List nodes
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

\`\`\`bash
npm install
\`\`\`

## Run

\`\`\`bash
npm start
\`\`\`

## Configuration

API keys are stored in \`.env\`. Never commit this file.

## Learn More

- [Mujarrad Documentation](https://docs.mujarrad.com)
- [SDK Reference](https://github.com/mujarrad/mujarrad-cli/tree/main/packages/sdk)
`;

    // Write all files
    await Promise.all([
      fs.writeFile(path.join(projectDir, 'package.json'), JSON.stringify(packageJson, null, 2)),
      fs.writeFile(path.join(projectDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2)),
      fs.writeFile(path.join(projectDir, '.env'), envContent),
      fs.writeFile(path.join(projectDir, '.gitignore'), gitignoreContent),
      fs.writeFile(path.join(projectDir, 'src', 'index.ts'), indexTs),
      fs.writeFile(path.join(projectDir, 'src', 'schema.ts'), schemaTs),
      fs.writeFile(path.join(projectDir, 'README.md'), readmeContent),
    ]);

    this.logger.info('Project scaffolded', { projectDir });
    return projectDir;
  }
}
