#!/usr/bin/env node
import * as commander from 'commander';
import { CommanderStatic } from 'commander';
import { CommandLoader } from './commands';
// import {
//   loadLocalBinCommandLoader,
//   localBinExists,
// } from './utils/local-binaries';

const bootstrap = async () => {
  const program: CommanderStatic = commander;
  program
    .version(
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('../package.json').version,
      '-v, --version',
      'Output the current version.',
    )
    .usage('<command> [options]')
    .helpOption('-h, --help', 'Output usage information.');

  await CommandLoader.load(program);
  await commander.parseAsync(process.argv);

  // if (localBinExists()) {
  //   const localCommandLoader = loadLocalBinCommandLoader();
  //   await localCommandLoader.load(program);
  // } else {
  //   await CommandLoader.load(program);
  // }
  // await commander.parseAsync(process.argv);

  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
};

bootstrap();
