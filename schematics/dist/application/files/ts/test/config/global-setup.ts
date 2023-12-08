import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

export default async function (globalConfig, projectConfig) {
  function getDatabaseUri() {
    const user = process.env.DATABASE_USER;
    const password = process.env.DATABASE_PASSWORD;
    const authSource = process.env.DATABASE_AUTH_SOURCE;
    const host = process.env.DATABASE_HOST;
    const port = process.env.DATABASE_PORT;
    const databaseName = process.env.DATABASE_NAME;

    const userString = user && password ? `${user}:${password}@` : '';
    const authSourceString = authSource ? `?authSource=${authSource}&w=1` : '';

    const mongoUri = `mongodb://${userString}${host}:${port}/${databaseName}${authSourceString}`;
    return mongoUri;
  }

  const mongooseInstance = await mongoose.connect(getDatabaseUri());
  await mongoose.connection.db.dropDatabase();
  // Set reference to mongod in order to close the server during teardown.
  globalThis.__MONGOOSE__ = mongooseInstance;
}
