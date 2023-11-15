import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import {
  DocumentBuilder,
  SwaggerCustomOptions,
  SwaggerModule,
} from '@nestjs/swagger';
import { Response } from 'express';
import expressRateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { SpelunkerModule } from 'nestjs-spelunker';
import { AppModule } from './app.module';
import { Environment } from './config/env.variables';
import { ApiConfig } from './config/interfaces/api-config.interface';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  // app.enable('trust proxy'); // See: https://github.com/express-rate-limit/express-rate-limit/wiki/Troubleshooting-Proxy-Issues
  app.use(helmet());

  app.use(
    expressRateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later',
    }),
  );
  const createAccountLimiter = expressRateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour window
    max: 3, // start blocking after 3 requests
    message: 'Too many accounts created from this IP, please try again later',
  });
  app.use('/auth/email/register', createAccountLimiter);

  if (process.env.NODE_ENV === Environment.Development) {
    setupDependencyGraph(app);
    setupOpenApiDocs(app);
  }

  const apiConfig = app.get<ConfigService>(ConfigService).get<ApiConfig>('api');

  await app.listen(apiConfig.internalPort);
}
bootstrap();

/**
 *
 * Builds a Dependency Graph to provide a high level view of the NestJS application
 *
 */
function setupDependencyGraph(app: NestExpressApplication) {
  // console.log(SpelunkerModule.explore(app));
  const globalModules = ['JwtModule', 'ConfigHostModule', 'MongooseCoreModule'];
  const commonModules = [
    'ConfigModule',
    'StandardResponseModule',
    'MongooseModule',
  ];
  // 1. Generate the tree as text
  const tree = SpelunkerModule.explore(app);
  const root = SpelunkerModule.graph(tree);
  const edges = SpelunkerModule.findGraphEdges(root);
  const apiEndpointModuleIcon = 'fa:fa-globe ';
  const mermaidEdges = edges
    .filter(
      ({ from, to }) =>
        !(
          globalModules.includes(from.module.name) ||
          globalModules.includes(to.module.name)
        ),
    )
    .map(({ from, to }) => {
      const fromHasController = from.module.controllers.length > 0;
      const fromClassTag = fromHasController ? ':::restEndpoint' : '';
      const fromIconTag = fromHasController ? apiEndpointModuleIcon : '';
      const fromShapeIn = fromHasController ? '{{' : '(';
      const fromShapeOut = fromHasController ? '}}' : ')';

      const toHasController = to.module.controllers.length > 0;
      const toClassTag = toHasController ? ':::restEndpoint' : '';
      const toIconTag = toHasController ? apiEndpointModuleIcon : '';
      const toShapeIn = toHasController ? '{{' : '(';
      const toShapeOut = toHasController ? '}}' : ')';

      let lineStyle = '===>';
      if (
        from.module.name !== 'AppModule' &&
        !commonModules.includes(from.module.name) &&
        commonModules.includes(to.module.name)
      )
        lineStyle = '-.->';

      if (to.module.name === 'JwtModule' || from.module.name === 'JwtModule')
        lineStyle = '~~~';

      return `${from.module.name}${fromShapeIn}${fromIconTag}${from.module.name}${fromShapeOut}${fromClassTag}${lineStyle}${to.module.name}${toShapeIn}${toIconTag}${to.module.name}${toShapeOut}${toClassTag}`;
    });
  const header = `%%{ init: { 'flowchart': { 'curve': 'monotoneX' } } }%%
flowchart LR
  subgraph legend[ Legend ]
    subgraph legendPadding [ ]
      direction TB
      ex2(Module)
      ex1{{fa:fa-globe Module exposing API endpoints}}:::restEndpoint
      ex3([Global Module]):::globalModule
    end
  end
  subgraph globalModules[ ]
  ${globalModules
    .map((module) => `\t${module}([${module}]):::globalModule`)
    .join('\n')}
  end
  subgraph appGraph[" "]
    direction LR`;
  const footer = `  end
classDef restEndpoint fill:darkgreen
classDef globalModule fill:indigo
classDef groupStyles rx:10,ry:10
class legend groupStyles
classDef layoutGroup fill:none,stroke:none
class appGraph,legendPadding,globalModules layoutGroup
style legend stroke-dasharray: 0 1 1,fill:none,opacity:0.95
`;
  const mermaidGraph = `${header}\n\t${mermaidEdges.join('\n\t')}\n${footer}`;
  app.getHttpAdapter().get('/dev-tools/graph', (req, res: Response) => {
    // res.set('Content-Type', 'text/markdown');
    res.set('Content-Type', 'text/vnd.mermaid');
    res.send(mermaidGraph);
    // Copy and paste in "https://mermaid.live/"
  });
}

// subgraph CM[Common modules]
//       ConfigModule
//       StandardResponseModule
//       MongooseModule
//     end
//     subgraph MM[Main modules]
//       UserModule
//       AuthModule
//       PoliciesModule
//       MailerModule
//     end

/**
 *
 * Builds the OpenAPI JSON object providing documentation for the app
 *
 */
function setupOpenApiDocs(app: NestExpressApplication) {
  // app.useStaticAssets(join(__dirname, '../..', 'docs'), { prefix: '/docs' });
  const config = new DocumentBuilder()
    .setTitle('API Live Documentation')
    .setDescription(
      'Auto generated by @nestjs/swagger following the Open API specification.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const swaggerUiOptions: SwaggerCustomOptions = {
    // explorer: true,
    swaggerOptions: {
      filter: true,
      // deepLinking: true,
      persistAuthorization: true,
      defaultModelsExpandDepth: 0, // set to -1 to hide the 'Schemas' section from docs
    },
  };
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('dev-tools/docs', app, document, swaggerUiOptions);
}
