/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require('fs');
const path = require('path');

/**
 * Copies the package.json file from the source app into the schematics used
 * to scaffold the generated apps.
 *
 * This will replace some fields with template strings to be populated with the
 * cli options.
 *
 * It'll also remove some dependencies that are only needed for the CLI tool (and
 * not the generated app).
 */
async function copyPackageJson() {
  const originalPath = path.join(__dirname, '../../package.json');
  const destinationPath = path.join(
    __dirname,
    '../dist/application/files/ts/package.json',
  );
  const originalFile = await fs.promises.readFile(originalPath, {
    encoding: 'utf8',
  });
  const json = JSON.parse(originalFile);
  json.name = '<%= name %>';
  json.version = '<%= version %>';
  json.description = '<%= description %>';
  json.author = '<%= author %>';
  json.private = true;
  json.license = 'UNLICENSED';

  delete json.keywords;
  delete json.bugs;
  delete json.homepage;
  delete json.schematics;
  delete json.engines;
  delete json.bin;

  delete json.scripts.publishSchematics;
  delete json.scripts.updateSchematics;
  delete json.scripts['prebuild:cli'];
  delete json.scripts['build:cli'];
  delete json.scripts['build:cli:only'];

  delete json.dependencies['@angular-devkit/schematics-cli'];
  delete json.dependencies.commander;
  delete json.dependencies.inquirer;
  delete json.devDependencies['@types/inquirer'];
  delete json.devDependencies.copyfiles;

  // console.log(json);

  const newFile = JSON.stringify(json, null, 2);
  await fs.promises.writeFile(destinationPath, newFile, { encoding: 'utf8' });
}

copyPackageJson();
