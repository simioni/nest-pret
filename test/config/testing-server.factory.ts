import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { MailerService } from '../../src/mailer/mailer.service';

export class TestingServerFactory {
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
      })
      .compile();

    this.testingApp = this.testingModule.createNestApplication();
    const configService = await this.testingModule.resolve(ConfigService);
    const url = configService.get('api.internalUrl');
    const jestWorkerIndex = parseInt(process.env.JEST_WORKER_ID || '1');
    const port =
      parseInt(configService.get('api.internalPort')) + jestWorkerIndex;
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
