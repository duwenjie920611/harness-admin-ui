import { fileURLToPath, URL } from "node:url";
import { defineConfig, loadEnv } from "vite";
import vue from "@vitejs/plugin-vue";
import AutoImport from "unplugin-auto-import/vite";
import Components from "unplugin-vue-components/vite";
import { ElementPlusResolver } from "unplugin-vue-components/resolvers";

/**
 * 与参考工程一致的按需导入策略：
 * - AutoImport 负责 ElMessage / ElMessageBox 等函数式 API 的自动引入
 * - Components 负责 <el-xxx> 模板组件的自动注册并按需引入样式
 */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "VITE_");
  const elementPlusResolver = ElementPlusResolver({ importStyle: "css" });

  return {
    plugins: [
      vue(),
      AutoImport({
        resolvers: [elementPlusResolver],
        dts: "src/types/auto-imports.d.ts",
      }),
      Components({
        resolvers: [elementPlusResolver],
        dts: "src/types/components.d.ts",
      }),
    ],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      port: Number(env.VITE_PORT) || 5173,
      proxy: {
        "/api/auth": {
          target: "http://localhost:8080",
          changeOrigin: true,
        },
        "/api/chat": {
          target: "http://localhost:8080",
          changeOrigin: true,
          timeout: 150000,
          proxyTimeout: 150000,
        },
        // 开发态将 /api 透传到后端，目标地址由 VITE_PROXY_TARGET 配置
        "/api": {
          target: env.VITE_PROXY_TARGET,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: "dist",
      sourcemap: false,
    },
  };
});
