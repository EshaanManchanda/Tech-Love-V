import mongoose from "mongoose";
import { afterAll, afterEach, beforeAll } from "vitest";

// Runs against the Docker Mongo service in docker-compose.yml (`docker compose up -d mongo`),
// using a dedicated test database so it never touches dev data.
const TEST_URI = process.env.TEST_MONGODB_URI ?? "mongodb://localhost:27017/certificate-license-platform-test";

beforeAll(async () => {
  await mongoose.connect(TEST_URI);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
