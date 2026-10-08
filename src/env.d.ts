import type { WorkerBindings } from "../celld/env";

declare global {
  interface Env extends WorkerBindings {}
}

export {};
