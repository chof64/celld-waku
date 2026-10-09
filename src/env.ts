export const workerEnvironment = {
  required: [] as const,
  optional: ["GREETING", "CHAT_BACKEND_URL"] as const,
};

export interface WorkerBindings {
  GREETING?: string;
  CHAT_BACKEND_URL?: string;
  CHAT_SERVICE?: Fetcher;
  ASSETS: Fetcher;
}
