import { currentUser, restoreUser } from "./api/auth";
import { useUserStore } from "./store/user";

import { createApp } from "vue";
import App from "./App.vue";
import routes from "./router";
import { createPinia } from "pinia";
import { registerGlobalFunction } from "./components/index";
import "element-plus/theme-chalk/base.css";
import "element-plus/theme-chalk/el-message.css";
import "./styles/element-plus-theme.css";
import "./styles/common.scss";
import { permission, registerAuthDirective } from "./plugins/permission";
import { createRouter, createWebHashHistory } from "vue-router";
import { isProduction } from "./environment";

if (typeof window !== "undefined" && !isProduction()) {
  // ResizeObserver loop 是浏览器已知噪声，不阻断开发调试
  const RESIZE_OBSERVER_PATTERN = /ResizeObserver loop/;
  window.addEventListener(
    "error",
    (e) => {
      if (e.message && RESIZE_OBSERVER_PATTERN.test(e.message)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  window.addEventListener("unhandledrejection", (e) => {
    const reason = e.reason;
    const msg =
      typeof reason === "string"
        ? reason
        : reason instanceof Error
        ? reason.message
        : "";
    if (msg && RESIZE_OBSERVER_PATTERN.test(msg)) {
      e.stopImmediatePropagation();
      e.preventDefault();
    }
  });
}

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});
router.beforeEach(async to => {
  if (to.path === "/chat" && !currentUser.value) {
    try {
      await restoreUser();
    } catch {
      return "/login";
    }
  }
  if (to.path === "/login" && currentUser.value) {
    return "/chat";
  }
  return true;
});
const instance = createApp(App);
const pinia = createPinia();

instance.use(pinia);
permission(router);

const userStore = useUserStore(pinia);
const getQueryString = (value: unknown) => {
  if (Array.isArray(value)) return value[0] || "";
  return typeof value === "string" ? value : "";
};

// 支持通过链接参数注入用户信息
router.beforeEach((to, _from, next) => {
  if (to.query.userCode) {
    userStore.setUserInfo({
      userCode: getQueryString(to.query.userCode),
      userName: getQueryString(to.query.userName),
    });
  }
  next();
});

registerGlobalFunction(instance);
registerAuthDirective(instance);

instance.use(router).mount("#app");
