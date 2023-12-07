"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.main = void 0;
const core_1 = require("@angular-devkit/core");
const schematics_1 = require("@angular-devkit/schematics");
const path_1 = require("path");
const formatting_1 = require("../utils/formatting");
const defaults_1 = require("../defaults");
function main(options) {
    options.name = (0, formatting_1.normalizeToKebabOrSnakeCase)(options.name.toString());
    const path = !options.directory || options.directory === 'undefined'
        ? options.name
        : options.directory;
    options = transform(options);
    return (0, schematics_1.mergeWith)(generate(options, path));
}
exports.main = main;
function transform(options) {
    const target = Object.assign({}, options);
    target.author = !!target.author ? target.author : defaults_1.DEFAULT_AUTHOR;
    target.description = !!target.description
        ? target.description
        : defaults_1.DEFAULT_DESCRIPTION;
    target.language = !!target.language ? target.language : defaults_1.DEFAULT_LANGUAGE;
    target.name = resolvePackageName(target.name.toString());
    target.version = !!target.version ? target.version : defaults_1.DEFAULT_VERSION;
    target.specFileSuffix = (0, formatting_1.normalizeToKebabOrSnakeCase)(options.specFileSuffix || 'spec');
    target.packageManager =
        !target.packageManager || target.packageManager === 'undefined'
            ? 'npm'
            : target.packageManager;
    target.dependencies = !!target.dependencies ? target.dependencies : '';
    target.devDependencies = !!target.devDependencies
        ? target.devDependencies
        : '';
    return target;
}
/**
 * The rules for `name` field defined at https://www.npmjs.com/package/normalize-package-data
 * are the following: the string may not:
 * 1. start with a period.
 * 2. contain the following characters: `/@\s+%`.
 * 3. contain any characters that would need to be encoded for use in URLs.
 * 4. resemble the word `node_modules` or `favicon.ico` (case doesn't matter).
 * but only the rule *1* is addressed by this function as the other ones doesn't
 * have a canonical representation.
 */
function resolvePackageName(path) {
    const { base: baseFilename, dir: dirname } = (0, path_1.parse)(path);
    if (baseFilename === '.') {
        return (0, path_1.basename)(process.cwd());
    }
    // If is as a package with scope (https://docs.npmjs.com/misc/scope)
    if (dirname.match(/^@[^\s]/)) {
        return `${dirname}/${baseFilename}`;
    }
    return baseFilename;
}
function generate(options, path) {
    const language = options.language || 'ts';
    return (0, schematics_1.apply)((0, schematics_1.url)((0, core_1.join)('./files', language)), [
        options.spec
            ? (0, schematics_1.noop)()
            : (0, schematics_1.filter)((path) => !path.endsWith('__specFileSuffix__.ts')),
        options.spec
            ? (0, schematics_1.noop)()
            : (0, schematics_1.filter)((path) => {
                const languageExtension = language;
                const suffix = `__specFileSuffix__.${languageExtension}`;
                return !path.endsWith(suffix);
            }),
        (0, schematics_1.template)(Object.assign(Object.assign({}, core_1.strings), options)),
        (0, schematics_1.move)(path),
    ]);
}
//# sourceMappingURL=application.factory.js.map