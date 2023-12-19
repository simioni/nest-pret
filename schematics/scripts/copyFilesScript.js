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

  const newFile = JSON.stringify(json, null, 2);
  await fs.promises.writeFile(destinationPath, newFile, { encoding: 'utf8' });
}

/**
 * Copies the .gitignore file and renames it into .gitignore.example.
 * This file is renamed back by by the CLI tool after the the code is generated.
 * This workaround is needed due to a controversial design decision by npm to
 * completely remove .gitignore files from published packages.
 *
 * To learn more about the issue:
 * See: https://github.com/npm/npm/issues/7252
 * and https://github.com/npm/npm/issues/1862
 */
async function copyGitIgnore() {
  const originalPath = path.join(__dirname, '../../.gitignore');
  const destinationPath = path.join(
    __dirname,
    '../dist/application/files/ts/.gitignore.example',
  );
  await fs.promises.copyFile(originalPath, destinationPath);
}

/**
 * Copies the .env.example file and replace some fields with template strings
 * to be populated with the cli options.
 */
async function copyDotEnv() {
  const originalPath = path.join(__dirname, '../../.env.example');
  const destinationPath = path.join(
    __dirname,
    '../dist/application/files/ts/.env.example',
  );
  let file = await fs.promises.readFile(originalPath, {
    encoding: 'utf8',
  });
  const databaseNameRegex = new RegExp('^DATABASE_NAME=.*', 'gm');
  const mailerNameRegex = new RegExp('^MAILER_FROM_NAME=.*', 'gm');
  const mailerEmailRegex = new RegExp('^MAILER_FROM_EMAIL=.*', 'gm');
  file = file.replace(databaseNameRegex, 'DATABASE_NAME=<%= name %>');
  file = file.replace(mailerNameRegex, 'MAILER_FROM_NAME=<%= name %>');
  file = file.replace(
    mailerEmailRegex,
    'MAILER_FROM_EMAIL=contact@<%= name %>.yourdomain',
  );
  await fs.promises.writeFile(destinationPath, file, { encoding: 'utf8' });
}

/**
 * Copies docker-compose files and replace some fields with template strings
 * to be populated with the cli options.
 */
async function copyDockerCompose() {
  const pathDev = path.join(__dirname, '../../docker-compose.yml');
  const pathTest = path.join(__dirname, '../../docker-compose.test.yml');
  const destinationPathDev = path.join(
    __dirname,
    '../dist/application/files/ts/docker-compose.yml',
  );
  const destinationPathTest = path.join(
    __dirname,
    '../dist/application/files/ts/docker-compose.test.yml',
  );
  let fileDev = await fs.promises.readFile(pathDev, {
    encoding: 'utf8',
  });
  let fileTest = await fs.promises.readFile(pathTest, {
    encoding: 'utf8',
  });
  const nameRegex = new RegExp('^name:.*', 'gm');
  fileDev = fileDev.replace(nameRegex, "name: '<%= name %>-dev'");
  fileTest = fileTest.replace(nameRegex, "name: '<%= name %>-dev'");

  await fs.promises.writeFile(destinationPathDev, fileDev, {
    encoding: 'utf8',
  });
  await fs.promises.writeFile(destinationPathTest, fileTest, {
    encoding: 'utf8',
  });
}

copyPackageJson();
copyGitIgnore();
copyDotEnv();
copyDockerCompose();
