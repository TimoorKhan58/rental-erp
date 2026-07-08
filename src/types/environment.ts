/** Environment and deployment-related shared types. */

export type NodeEnvironment = "development" | "production" | "test";

export type AppEnvironment = {
  nodeEnv: NodeEnvironment;
  appUrl: string;
};
