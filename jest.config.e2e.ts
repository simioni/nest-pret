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
  // setupFilesAfterEnv: ['<rootDir>/test/config/setup-e2e-tests.ts'],
  // 👇 Note that Jest does not support TS custom environments yet, so  this file
  // needs to be a JS file. It's being compiled prior to running the tests by
  // the e2e test script from package.json
  testEnvironment: './jest.env.e2e.ts',
  // testEnvironment: '<rootDir>/test/config/e2e-environment.config.ts',
  // testEnvironment: 'node',
  verbose: true,
  silent: false,
};

export default config;
