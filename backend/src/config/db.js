import path from 'node:path';
import fs from 'node:fs';
import mongoose from 'mongoose';
import { env, BACKEND_ROOT } from './env.js';

let memoryServer = null;
export let dbMode = 'disconnected';

/**
 * Connects to MongoDB Atlas when MONGODB_URI is set. Otherwise starts a LOCAL
 * DEVELOPMENT database (mongodb-memory-server) whose files are kept in
 * backend/.data so data survives restarts. This fallback is for local demos only.
 */
export async function connectDB({ ephemeral = false } = {}) {
  mongoose.set('strictQuery', true);

  let uri = env.MONGODB_URI;
  if (env.useMemoryDb || ephemeral) {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    const instance = {};
    if (!ephemeral) {
      const dbPath = path.join(BACKEND_ROOT, '.data', 'mongo');
      fs.mkdirSync(dbPath, { recursive: true });
      Object.assign(instance, { dbPath, storageEngine: 'wiredTiger' });
    }
    memoryServer = await MongoMemoryServer.create({ instance });
    uri = memoryServer.getUri('kerakbolsa');
    dbMode = ephemeral ? 'memory-test' : 'local-dev';
  } else {
    dbMode = 'atlas';
  }

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
  return { mode: dbMode, host: mongoose.connection.host };
}

export async function disconnectDB() {
  await mongoose.disconnect();
  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
  dbMode = 'disconnected';
}
