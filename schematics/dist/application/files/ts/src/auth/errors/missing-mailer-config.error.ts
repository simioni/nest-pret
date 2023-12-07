import { InternalServerErrorException, Logger } from '@nestjs/common';
// import { REGISTRATION_ERROR } from '../user.constants';

const red = `\u001b[31m`;
const cyan = `\u001b[36m`;
const reset = `\u001b[0m`;
export class MissingMailerConfigError extends InternalServerErrorException {
  constructor(loggerTag = 'Mailer', errorLocation = '') {
    const logger = new Logger(loggerTag);
    logger.error(`${red}Missing Mailer Configuration

  ${red} ERROR [${loggerTag}] ${errorLocation}

  ${red} A configuration for the mailer service was not found
  ${reset} You need to add your mailer service information in the ${cyan}.env ${reset}file.
  
  ${red} This file is not checked into git.
  ${reset} If you don't have one, you can open the provided ${cyan}.env.example${reset} file and save it as ${cyan}.env${reset}.
  ${reset} Check out the ${cyan}configuration.interface.ts ${reset}file for a list of all accepted variables.
      `);
    super({
      message: 'MissingMailerConfigError',
    });
  }
}
