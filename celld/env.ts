export const workerEnvironment = {
  required: [] as const,
  optional: ["GREETING"] as const,
};

export interface WorkerBindings {
  GREETING?: string;
  ASSETS: Fetcher;
}
