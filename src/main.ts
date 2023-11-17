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
import { SpelunkedTree, SpelunkerModule } from 'nestjs-spelunker';
import * as _ from 'lodash';

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
  // TODO uncomment this
  // app.use('/auth/email/register', createAccountLimiter);

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
  const icons = {
    model: 'fa:fa-database ',
    controller: 'fa:fa-globe ',
    provider: 'fa:fa-briefcase ',
    interceptor: 'fa:fa-bullseye ',
    pipe: 'fa:fa-fish-fins ',
    guard: 'fa:fa-shield-halved ',
    service: 'fa:fa-bell-concierge ',
    // provider: 'fa:fa-bell-concierge ',
  };

  const originalTree = SpelunkerModule.explore(app);
  const tree: SpelunkedTree[] = [];
  originalTree.forEach((module: SpelunkedTree) => {
    const index = tree.findIndex((elem) => elem?.name === module.name);
    if (index === -1) {
      tree.push(module);
      return;
    }
    tree[index] = {
      name: tree[index].name,
      imports: _.union(tree[index].imports, module.imports),
      controllers: _.union(tree[index].controllers, module.controllers),
      exports: _.union(tree[index].exports, module.exports),
      providers: {
        ...tree[index].providers,
        ...module.providers,
      },
    };
  });

  const globalModules = [
    'ConfigModule',
    'JwtModule',
    'ConfigHostModule',
    'MongooseCoreModule',
  ];
  const commonModules = ['StandardResponseModule', 'MongooseModule'];

  // const mermaidGraph = buildSimpleDepencyGraph(
  const mermaidGraph = buildExpandedDepencyGraph(
    tree,
    globalModules,
    commonModules,
    icons,
  );
  app.getHttpAdapter().get('/dev-tools/graph', (req, res: Response) => {
    // res.set('Content-Type', 'text/markdown');
    res.set('Content-Type', 'text/vnd.mermaid');
    res.send(mermaidGraph);
    // Copy and paste in "https://mermaid.live/"
  });
}

function buildSimpleDepencyGraph(edges, globalModules, commonModules) {
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
  return mermaidGraph;
}

function buildExpandedDepencyGraph(tree, globalModules, commonModules, icons) {
  const root = SpelunkerModule.graph(tree);
  const edges = SpelunkerModule.findGraphEdges(root);
  // const inspectedModules = [];
  const mermaidEdges = edges
    .filter(
      ({ from, to }) =>
        !(
          globalModules.includes(from.module.name) ||
          globalModules.includes(to.module.name)
        ),
    )
    .map(({ from, to }) => {
      let lineStyle = '===>';
      if (
        from.module.name !== 'AppModule' &&
        !commonModules.includes(from.module.name) &&
        commonModules.includes(to.module.name)
      )
        lineStyle = '-.->';
      if (to.module.name === 'JwtModule' || from.module.name === 'JwtModule')
        lineStyle = '~~~';
      return `${from.module.name}${lineStyle}${to.module.name}`;
    });
  const moduleSubgraphs = tree.map((module) =>
    buildModuleSubgraph(module, globalModules, icons),
  );
  const nonGlobalModuleNames = tree
    .map((module) => module.name)
    .filter((elem) => !globalModules.includes(elem));
  const header = `%%{ init: { 'flowchart': { 'curve': 'monotoneX' }, 'theme':'dark' } }%%
flowchart LR
\tsubgraph legend[ Legend ]
\t\tdirection LR
\t\tsubgraph legendLine1 [ ]
\t\t\tdirection TB
\t\t\tex1(Module)
\t\t\tex2([Global Module]):::globalModule
\t\t\tex3{{${icons.controller}Controller}}:::controller
\t\t\tex9([${icons.service}Service]):::service
\t\t\tex4([${icons.provider}Provider]):::provider
\t\tend
\t\tsubgraph legendLine2 [ ]
\t\t\tdirection TB
\t\t\tex6{{${icons.pipe}Global Pipe}}:::pipe
\t\t\tex7{{${icons.interceptor}Global Interceptor}}:::interceptor
\t\t\tex8{{${icons.guard}Global Guard}}:::guard
\t\t\tex5([${icons.model}Model]):::model
\t\tend
\tend
\tsubgraph globalModules[ ]
${globalModules
  .map((module) => `\t\t${module}([${module}]):::globalModule`)
  .join('\n')}
\tend
\tsubgraph modules[" "]
\t\tdirection LR
\t\t${moduleSubgraphs.join('')}`;

  const footer = `\tend
classDef controller fill:darkgreen
classDef provider fill:#1f2020
classDef service fill:#1f2020
classDef pipe fill:#8b0e5d
classDef guard fill:#8b0e5d
classDef interceptor fill:#8b0e5d
classDef model fill:#b83100
classDef moduleSubgraph fill:#1f2020,stroke:#81B1DB,rx:5,ry:5
classDef globalModule fill:indigo,stroke:#81B1DB,rx:5,ry:5
classDef layoutGroup fill:none,stroke:none
classDef groupStyles rx:10,ry:10
class legend groupStyles
class modules,globalModules,legendLine1,legendLine2 layoutGroup
class ${globalModules.map((module) => `${module}Padding`).join(',')} layoutGroup
class ${nonGlobalModuleNames.join(',')} moduleSubgraph
style legend stroke-dasharray: 0 1 1,fill:white,fill-opacity:0.02,opacity:0.95
`;
  const mermaidGraph = `${header}\n\t\t${mermaidEdges.join(
    '\n\t\t',
  )}\n${footer}`;
  return mermaidGraph;
}

function buildModuleSubgraph(module, globalModules, icons) {
  // exclude inernals for global modules
  if (globalModules.includes(module.name))
    return `subgraph ${module.name}[ ]
\t\t\t\tsubgraph ${module.name}Padding[${module.name}]
\t\t\t\tend
\t\tend
\t\t`;

  const hasControllers = module.controllers.length > 0;
  const controllerNodes = hasControllers
    ? module.controllers
        .map(
          (controller) =>
            `${controller}{{${icons.controller}${controller}}}:::controller`,
        )
        .join('\n\t')
        .concat('\n\t\t\t')
    : '';
  const hasProviders = Object.keys(module.providers).length > 0;
  const providerNodes = hasProviders
    ? Object.keys(module.providers)
        .map((key) => getProviderNode(key, icons))
        .join('\n\t\t\t')
    : '';
  return `subgraph ${module.name}
\t\t\tdirection LR
\t\t\t${controllerNodes}${providerNodes}
\t\tend\n\t\t`;
}

function getProviderNode(providerName: string, icons) {
  const knownProviders = [
    {
      name: 'APP_PIPE',
      lookUp: '^APP_PIPE*',
      value: 'Pipe',
      icon: icons.pipe,
      class: ':::pipe',
      shapeIn: '{{',
      shapeOut: '}}',
    },
    {
      name: 'APP_GUARD',
      lookUp: '^APP_GUARD*',
      value: 'Guard',
      icon: icons.guard,
      class: ':::guard',
      shapeIn: '{{',
      shapeOut: '}}',
    },
    {
      name: 'APP_INTERCEPTOR',
      lookUp: '^APP_INTERCEPTOR*',
      value: 'Interceptor',
      icon: icons.interceptor,
      class: ':::interceptor',
      shapeIn: '{{',
      shapeOut: '}}',
    },
    {
      name: 'MODEL',
      lookUp: 'Model$',
      value: providerName,
      icon: icons.model,
      class: ':::model',
      shapeIn: '([',
      shapeOut: '])',
    },
    {
      name: 'SERVICE',
      lookUp: 'Service$',
      value: providerName,
      icon: icons.service,
      class: ':::service',
      shapeIn: '([',
      shapeOut: '])',
    },
  ];
  const node = knownProviders.find((elem) =>
    providerName.match(new RegExp(elem.lookUp)),
  );
  if (node)
    return `${node.value}${node.shapeIn}${node.icon}${node.value}${node.shapeOut}${node.class}`;

  const safeName = providerName.replace(/(\(|\)| )/g, '_');
  return `${safeName}(["${icons.provider}${providerName}"]):::provider`;
}

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
