/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 全局环境标识，可在 .env.[mode] 中通过 VITE_ENV 覆盖 */
  readonly VITE_ENV: string;
  /** 接口基础地址 */
  readonly VITE_API_URL: string;
  /** 开发态代理目标地址 */
  readonly VITE_PROXY_TARGET: string;
  /** 本地开发端口 */
  readonly VITE_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.scss";
declare module "*.css";
