// const NodeEnvironment = require('jest-environment-node').TestEnvironment;
// const jestEnvironmentNode = require('jest-environment-node');
import NodeEnvironment from 'jest-environment-node';
// import { TestingServer } from './test/config/setup-test-server';
// import { TestingServer } from './setup-test-server';

class CustomEnvironment extends NodeEnvironment {
  // private testingServer: TestingServer;
  private testPath;

  constructor(config, context) {
    super(config, context);
    // console.log(config.globalConfig);
    // console.log(config.projectConfig);
    // console.log(context.testPath);
    // console.log(context.docblockPragmas);
    // this.docblockPragmas = context.docblockPragmas;
    this.testPath = context.testPath;
    if (this.testPath === '/usr/src/app/test/users.e2e-spec.ts') {
      console.error('Using API_EMAIL_VERIFICATION=delayed for ', this.testPath);
      process.env = {
        ...process.env,
        API_EMAIL_VERIFICATION: 'delayed',
      };
      console.error(
        'new process.env.API_EMAIL_VERIFICATION: ',
        process.env.API_EMAIL_VERIFICATION,
      );
    }
  }

  async setup() {
    await super.setup();
    console.error('SETTING UP:', process.env.JEST_WORKER_ID);
    // this.testingServer = new TestingServer();
    // await this.testingServer.create();
    // this.global.testingServer = this.testingServer;
    // this.global.testingServer = null;

    // const { testingModule, testingApp } = await CreateTestingServer();
    // this.global.testingModule = testingModule;
    // this.global.testingApp = testingApp;

    // Will trigger if docblock contains @my-custom-pragma my-pragma-value
    // if (this.docblockPragmas['my-custom-pragma'] === 'my-pragma-value') {
    //   // ...
    // }
  }

  async teardown() {
    // this.global.someGlobalObject = await destroyGlobalObject();
    // await someTeardownTasks();
    // await TeardownTestingServer();
    // await this.testingServer.teardown();
    await super.teardown();
  }

  getVmContext() {
    return super.getVmContext();
  }

  // async handleTestEvent(event, state) {
  //   if (event.name === 'test_start') {
  //     // ...
  //   }
  // }
}

export default CustomEnvironment;
