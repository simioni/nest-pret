"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RunnerFactory = void 0;
const chalk = require("chalk");
const npm_runner_1 = require("./npm.runner");
const runner_1 = require("./runner");
const schematic_runner_1 = require("./schematic.runner");
// import { YarnRunner } from './yarn.runner';
// import { PnpmRunner } from './pnpm.runner';
class RunnerFactory {
    static create(runner) {
        console.log('inside RunnerFactory.create', 'runner:', runner);
        switch (runner) {
            case runner_1.Runner.SCHEMATIC:
                return new schematic_runner_1.SchematicRunner();
            case runner_1.Runner.NPM:
                return new npm_runner_1.NpmRunner();
            // case Runner.YARN:
            //   return new YarnRunner();
            // case Runner.PNPM:
            //   return new PnpmRunner();
            default:
                console.info(chalk.yellow(`[WARN] Unsupported runner: ${runner}`));
        }
    }
}
exports.RunnerFactory = RunnerFactory;
