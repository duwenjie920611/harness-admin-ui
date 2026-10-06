import type { RouteRecordRaw } from "vue-router";
import { Tickets } from "@element-plus/icons-vue";

/** HarnessChat 的登录、聊天和错误页路由。根路径进入聊天，由登录守卫处理认证。 */
export const constantRoutes: Array<RouteRecordRaw> = [
  {
    path: "/",
    redirect: "/chat",
    meta: { hidden: true },
  },
  {
    path: "/login",
    name: "ChatLogin",
    component: () => import("@/views/Login/index.vue"),
    meta: { title: "登录", hidden: true },
  },
  {
    path: "/chat",
    name: "HarnessChat",
    component: () => import("@/views/Chat/index.vue"),
    meta: { title: "HarnessChat", icon: Tickets },
  },
  {
    path: "/404",
    name: "NoFoundPage",
    component: () => import("@/views/NoFound.vue"),
    meta: { hidden: true },
  },
  {
    path: "/:pathMatch(.*)*",
    redirect: "/404",
    meta: { hidden: true },
  },
];

export const asyncRoutes: Array<RouteRecordRaw> = [];

export default constantRoutes;
