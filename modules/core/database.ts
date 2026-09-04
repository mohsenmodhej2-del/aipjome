import { env } from 'cloudflare:workers';

type RuntimeEnv = { DB: D1Database };

export function database() {
  return (env as unknown as RuntimeEnv).DB;
}

export const newId = () => crypto.randomUUID();
export const timestamp = () => new Date().toISOString();
