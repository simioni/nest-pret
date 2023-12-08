import { NpmRunner } from './npm.runner';
import { Runner } from './runner';
import { SchematicRunner } from './schematic.runner';
export declare class RunnerFactory {
    static create(runner: Runner): NpmRunner | SchematicRunner | undefined;
}
