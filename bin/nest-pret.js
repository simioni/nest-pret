#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const commander = require("commander");
const commands_1 = require("./commands");
// import {
//   loadLocalBinCommandLoader,
//   localBinExists,
// } from './utils/local-binaries';
const bootstrap = async () => {
    const program = commander;
    program
        .version(
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../package.json').version, '-v, --version', 'Output the current version.')
        .usage('<command> [options]')
        .helpOption('-h, --help', 'Output usage information.');
    await commands_1.CommandLoader.load(program);
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
