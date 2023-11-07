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
  testEnvironment: './jest.env.e2e.ts',
  verbose: true,
  silent: false,
};

export default config;
