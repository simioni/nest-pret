"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchematicRunner = void 0;
const abstract_runner_1 = require("./abstract.runner");
class SchematicRunner extends abstract_runner_1.AbstractRunner {
    constructor() {
        console.log('inside SchematicRunner constructor');
        super(`node`, [`"${SchematicRunner.findClosestSchematicsBinary()}"`]);
    }
    static getModulePaths() {
        return module.paths;
    }
    static findClosestSchematicsBinary() {
        console.log('inside SchematicRunner findClosestSchematicsBinary');
        try {
            return require.resolve('@angular-devkit/schematics-cli/bin/schematics.js', { paths: this.getModulePaths() });
        }
        catch {
            console.log('ERROR "Angular Schematic not found" in SchematicRunner.findClosestSchematicsBinary');
            console.error('ERROR "Angular Schematic not found" in SchematicRunner.findClosestSchematicsBinary');
            throw new Error("'schematics' binary path could not be found!");
        }
    }
}
exports.SchematicRunner = SchematicRunner;
