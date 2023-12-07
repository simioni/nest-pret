"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NestPretCollection = void 0;
const abstract_collection_1 = require("./abstract.collection");
class NestPretCollection extends abstract_collection_1.AbstractCollection {
    constructor(runner) {
        super('nest-pret-schematics', runner);
    }
    async execute(name, options) {
        const schematic = this.validate(name);
        await super.execute(schematic, options);
    }
    getSchematics() {
        return NestPretCollection.schematics;
    }
    validate(name) {
        const schematic = NestPretCollection.schematics.find((s) => s.name === name || s.alias === name);
        if (schematic === undefined || schematic === null) {
            throw new Error(`Invalid schematic "${name}". Please, ensure that "${name}" exists in this collection.`);
        }
        return schematic.name;
    }
}
exports.NestPretCollection = NestPretCollection;
NestPretCollection.schematics = [
    {
        name: 'application',
        alias: 'app',
        description: 'Scaffolds a new Nest Pret application',
    },
];
