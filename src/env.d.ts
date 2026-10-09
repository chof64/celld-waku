import type { WorkerBindings } from "./env";

declare global {
  interface Env extends WorkerBindings {}
}

export {};
