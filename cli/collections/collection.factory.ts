import { Runner, RunnerFactory } from '../runners';
import { SchematicRunner } from '../runners/schematic.runner';
import { AbstractCollection } from './abstract.collection';
import { Collection } from './collection';
import { CustomCollection } from './custom.collection';
import { NestPretCollection } from './nest-pret.collection';
import { NestCollection } from './nest.collection';

export class CollectionFactory {
  public static create(collection: Collection | string): AbstractCollection {
    console.log('inside CollectionFactory.create:');
    const schematicRunner = RunnerFactory.create(
      Runner.SCHEMATIC,
    ) as SchematicRunner;
    console.log('schematicRunner:', schematicRunner);

    if (collection === Collection.NESTJS) {
      return new NestCollection(schematicRunner);
    } else if (collection === Collection.NESTPRET) {
      return new NestPretCollection(schematicRunner);
    } else {
      return new CustomCollection(collection, schematicRunner);
    }
  }
}
