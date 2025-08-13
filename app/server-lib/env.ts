export type AppEnv = "dev" | "docker";
export const APP_ENV: AppEnv =
  process.env.APP_ENV === "docker" ? "docker" : "dev";
