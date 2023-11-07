// let testingModule: TestingModule;
// let app: INestApplication;
// let server: HttpServer;
// let baseUrl: string;

// global.server = 'test';

beforeAll(async () => {
  console.error(global.testingServer);

  return;

  // if (global.testingServer !== null) return;

  // global.testingServer = new TestingServer();
  // await global.testingServer.create();

  // global.testingModule = await Test.createTestingModule({
  //   imports: [AppModule],
  // })
  //   .overrideProvider(MailerService)
  //   .useValue({
  //     sendEmailVerification: jest.fn(),
  //     sendEmailForgotPassword: jest.fn(),
  //   })
  //   .compile();

  // global.app = global.testingModule.createNestApplication();
  // const configService = await global.testingModule.resolve(ConfigService);
  // const port = await getDynamicPort(
  //   __filename,
  //   __dirname,
  //   configService.get('host.internalPort'),
  // );
  // global.baseUrl = `${configService.get('host.internalUrl')}:${port}`;
  // await global.app.init();
  // global.server = await global.app.listen(port);
});

afterAll(async () => {
  return;
  // if (!global.testingServer) return;
  // global.testingServer.teardown();
  // await global.app.close();
});

// export function getTestingModule() {
//   return global.testingModule;
// }
// export function getApp() {
//   return global.app;
// }
// export function getBaseUrl() {
//   return global.baseUrl;
// }
