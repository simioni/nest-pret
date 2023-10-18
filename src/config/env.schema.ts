import * as Joi from 'Joi';

/**
 * Defines a schema for the app's environment variables. This object
 * is used by @nestjs/config as a validationSchema while loading
 * the .env file.
 *
 * An exception will be thrown during application startup if the required
 * environment variables haven't been provided or if they don't meet
 * the schema validation rules.
 */
export default Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'production', 'test', 'provision')
    .default('development'),
  PORT: Joi.number().default(3000),
});
