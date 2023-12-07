import { Mongoose } from 'mongoose';

export default async function (globalConfig, projectConfig) {
  const mongoose: Mongoose = globalThis.__MONGOOSE__;
  await mongoose.connection.close();
}
