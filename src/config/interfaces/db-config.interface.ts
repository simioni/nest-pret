import { EnvironmentVariables } from '../env.variables';

type T = keyof EnvironmentVariables;

// renaming fields and keeping type
// https://stackoverflow.com/a/59071783/6175916
type PickRename<T, K extends keyof T, R extends PropertyKey> = {
  [P in keyof T as P extends K ? R : P]: T[P];
};

export interface DbConfig {
  user: string;
  password: string;
  host: string;
  port: number;
  databaseName: string;
  authSource: string;
}
