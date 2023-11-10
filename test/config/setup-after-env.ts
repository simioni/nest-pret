beforeAll(() => {
  // clears the jade cache between each e2e-spec file so we can freely
  // rewrite .env vars during runtime to test different configurations
  jest.resetModules();
});

afterAll(() => {
  //
});
