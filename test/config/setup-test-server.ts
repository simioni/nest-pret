import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { MailerService } from '../../src/mailer/mailer.service';
import { getDynamicPort } from './get-dynamic-port';

export class TestingServer {
  private testingModule: TestingModule;
  private testingApp: INestApplication;
  private baseUrl: string;

  public async create() {
    this.testingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(MailerService)
      .useValue({
        sendEmailVerification: () => true,
        sendEmailForgotPassword: () => true,
        // sendEmailVerification: jest.fn(),
        // sendEmailForgotPassword: jest.fn(),
      })
      .compile();

    this.testingApp = this.testingModule.createNestApplication();
    const configService = await this.testingModule.resolve(ConfigService);
    // const port = await getDynamicPort(
    //   __filename,
    //   __dirname,
    //   configService.get('host.internalPort'),
    // );
    const url = configService.get('host.internalUrl');
    const jestWorkerIndex = parseInt(process.env.JEST_WORKER_ID || '1');
    const port =
      parseInt(configService.get('host.internalPort')) + jestWorkerIndex;
    this.baseUrl = `${url}:${port}`;
    await this.testingApp.init();
    await this.testingApp.listen(port);
    return this;
  }

  public async teardown() {
    if (!this.testingApp) return;
    await this.testingApp.close();
  }

  public getModule() {
    return this.testingModule;
  }

  public getApp() {
    return this.testingApp;
  }

  public getBaseUrl() {
    return this.baseUrl;
  }
}
