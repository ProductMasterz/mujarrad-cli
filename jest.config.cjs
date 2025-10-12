/** @type {import('jest').Config} */
module.exports = {
  // Base configuration shared across all projects
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        esModuleInterop: true,
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(ora|chalk|cli-spinners|cli-cursor|log-symbols|is-interactive|is-unicode-supported|string-width|strip-ansi|ansi-regex|ansi-styles|#ansi-styles)/)',
  ],

  // Multi-project configuration for contract, unit, integration, and performance tests
  projects: [
    {
      displayName: 'contract',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      testMatch: ['**/tests/contract/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/contract-setup.ts'],
      extensionsToTreatAsEsm: ['.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            esModuleInterop: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(ora|chalk|cli-spinners|cli-cursor|log-symbols|is-interactive|is-unicode-supported|string-width|strip-ansi|ansi-regex|ansi-styles|#ansi-styles)/)',
      ],
      collectCoverageFrom: [
        'src/api/generated/**/*.ts',
        '!src/api/generated/**/*.d.ts',
      ],
      coverageDirectory: 'coverage/contract',
    },
    {
      displayName: 'unit',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      testMatch: ['**/tests/unit/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/unit-setup.ts'],
      extensionsToTreatAsEsm: ['.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            esModuleInterop: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(ora|chalk|cli-spinners|cli-cursor|log-symbols|is-interactive|is-unicode-supported|string-width|strip-ansi|ansi-regex|ansi-styles|#ansi-styles)/)',
      ],
      collectCoverageFrom: [
        'src/**/*.ts',
        '!src/**/*.d.ts',
        '!src/api/generated/**',
      ],
      coverageThreshold: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
      coverageDirectory: 'coverage/unit',
    },
    {
      displayName: 'integration',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      testMatch: ['**/tests/integration/**/*.test.ts'],
      setupFilesAfterEnv: ['<rootDir>/tests/setup/integration-setup.ts'],
      extensionsToTreatAsEsm: ['.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            esModuleInterop: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(ora|chalk|cli-spinners|cli-cursor|log-symbols|is-interactive|is-unicode-supported|string-width|strip-ansi|ansi-regex|ansi-styles|#ansi-styles)/)',
      ],
      coverageDirectory: 'coverage/integration',
      // Integration tests use real API, no coverage requirements
    },
    {
      displayName: 'performance',
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      testMatch: ['**/tests/performance/**/*.test.ts'],
      extensionsToTreatAsEsm: ['.ts'],
      moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          useESM: true,
          tsconfig: {
            esModuleInterop: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\\.{1,2}/.*)\\.js$': '$1',
      },
      transformIgnorePatterns: [
        'node_modules/(?!(ora|chalk|cli-spinners|cli-cursor|log-symbols|is-interactive|is-unicode-supported|string-width|strip-ansi|ansi-regex|ansi-styles|#ansi-styles)/)',
      ],
      coverageDirectory: 'coverage/performance',
      // Performance tests don't need coverage
    },
  ],

  // Overall coverage settings
  coverageDirectory: 'coverage',
  verbose: true,
};
