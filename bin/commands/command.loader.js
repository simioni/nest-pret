"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CommandLoader = void 0;
const chalk = require("chalk");
const actions_1 = require("../actions");
const ui_1 = require("../ui");
// import { AddCommand } from './add.command';
// import { BuildCommand } from './build.command';
// import { GenerateCommand } from './generate.command';
// import { InfoCommand } from './info.command';
const new_command_1 = require("./new.command");
// import { StartCommand } from './start.command';
class CommandLoader {
    static async load(program) {
        new new_command_1.NewCommand(new actions_1.NewAction()).load(program);
        // new BuildCommand(new BuildAction()).load(program);
        // new StartCommand(new StartAction()).load(program);
        // new InfoCommand(new InfoAction()).load(program);
        // new AddCommand(new AddAction()).load(program);
        // await new GenerateCommand(new GenerateAction()).load(program);
        this.handleInvalidCommand(program);
    }
    static handleInvalidCommand(program) {
        program.on('command:*', () => {
            console.error(`\n${ui_1.ERROR_PREFIX} Invalid command: ${chalk.red('%s')}`, program.args.join(' '));
            console.log(`See ${chalk.red('--help')} for a list of available commands.\n`);
            process.exit(1);
        });
    }
}
exports.CommandLoader = CommandLoader;
