import { AbstractRunner } from './abstract.runner';

export class SchematicRunner extends AbstractRunner {
  constructor() {
    console.log('inside SchematicRunner constructor');
    super(`node`, [`"${SchematicRunner.findClosestSchematicsBinary()}"`]);
  }

  public static getModulePaths() {
    return module.paths;
  }

  public static findClosestSchematicsBinary(): string {
    console.log('inside SchematicRunner findClosestSchematicsBinary');
    try {
      return require.resolve(
        '@angular-devkit/schematics-cli/bin/schematics.js',
        { paths: this.getModulePaths() },
      );
    } catch {
      console.log(
        'ERROR "Angular Schematic not found" in SchematicRunner.findClosestSchematicsBinary',
      );
      console.error(
        'ERROR "Angular Schematic not found" in SchematicRunner.findClosestSchematicsBinary',
      );
      throw new Error("'schematics' binary path could not be found!");
    }
  }
}
