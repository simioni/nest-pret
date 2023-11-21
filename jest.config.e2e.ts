import type { Config } from 'jest';

const config: Config = {
  rootDir: './',
  moduleFileExtensions: ['js', 'json', 'ts'],
  moduleDirectories: ['<rootDir>', 'node_modules'],
  // modulePaths: ['./'],
  testRegex: '.e2e-spec.ts$',
  transform: {
    '^.+\\.(t|j)s$': [
      'ts-jest',
      {
        tsconfig: './tsconfig.json',
        // tsConfig: '<rootDir>/tsconfig.json',
      },
    ],
  },
  globalSetup: '<rootDir>/test/config/global-setup.ts',
  globalTeardown: '<rootDir>/test/config/global-teardown.ts',
  setupFilesAfterEnv: ['<rootDir>/test/config/setup-after-env.ts'],
  // testEnvironment: './jest.env.e2e.ts',
  verbose: true,
  silent: false,
  // allows jest to load modules with absolute imports
  moduleNameMapper: {
    'src/(.*)': '<rootDir>/src/$1',
  },
};

export default config;
