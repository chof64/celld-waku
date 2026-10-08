import { env } from "cloudflare:workers";
import { z } from "zod";

const Greeting = z.string().trim().min(1).max(80);

export default async function Demo() {
  const greeting = Greeting.catch("Hello from Celld").parse(env.GREETING);
  return <section><title>Server demo</title><h1>{greeting}</h1><p>This value was read in a React Server Component from a configured Workers binding.</p><p>Try the <a href="/api/health">health API</a>.</p></section>;
}

export const getConfig = async () => ({ render: "dynamic" as const });
