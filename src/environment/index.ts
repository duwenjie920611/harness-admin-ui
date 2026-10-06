import type { EnvTypes } from "./types";

/** 全局环境，在 .env.[mode] 中通过 VITE_ENV 覆盖 */
export const env = (import.meta.env.VITE_ENV as EnvTypes) || "development";

/** 接口基础地址 */
export const API_HOST = import.meta.env.VITE_API_URL || "";

/** 是否生产环境 */
export function isProduction() {
  return env === "production";
}
