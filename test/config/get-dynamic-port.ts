import { readdir } from 'node:fs/promises';
import * as path from 'node:path';

/**
 * Retrieves a unique port number to use for the API server created by a test file to listen at.
 * Setting unique ports allows the tests to run concurrently.
 *
 * @param filename NodeJs' internal __filename const for a given test file
 * @param dirname NodeJs' internal __dirname const for a given test file
 * @param basePort The initial port to use for the test servers
 * @returns A promise resolving to the port number to use
 */
export function getDynamicPort(
  filename: string,
  dirname: string,
  basePort: number,
): Promise<number> {
  return readdir(dirname).then((files) => {
    // console.error(files);
    // const pathFileName = path.basename(filename, path.extname(filename));
    const pathFileName = path.basename(filename);
    const index = files.indexOf(pathFileName);
    // console.error(
    //   `${pathFileName} (${index} file in dir) will use port ${basePort + index}`,
    // );
    return basePort + index;
  });
}
