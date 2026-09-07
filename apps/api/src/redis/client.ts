import { createClient } from "redis";

export function createRedisClient(redisUrl: string) {
  if (!redisUrl) throw new Error("REDIS_URL is required");

  const client = createClient({ url: redisUrl });
  client.on("error", (error) => {
    console.error("Redis client error", error);
  });
  return client;
}
