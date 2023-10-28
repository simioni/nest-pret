import { Logger } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvironmentVariables } from './env.variables';

export function validateEnvironmentVariables(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const red = `\u001b[31m`;
    const cyan = `\u001b[36m`;
    const reset = `\u001b[0m`;
    const loggerTag = 'ConfigModule';
    const logger = new Logger(loggerTag);
    logger.error(`${red}Missing or invalid environment variables

  ${reset} You need to add missing variables to the ${cyan}.env ${reset}file. ${red}(This file is not checked into git.)

  ${reset} If you don't have one, you can open the provided ${cyan}.env.example${reset} file and save it as ${cyan}.env${reset}.

  ${red} The following environment variables are missing or haven't passed validation:
    `);
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
