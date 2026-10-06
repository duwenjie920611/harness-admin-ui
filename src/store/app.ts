import { defineStore } from "pinia";
import type { RouteRecordRaw } from "vue-router";

export const useAppStore = defineStore("app", {
  state: () => {
    return {
      /** 侧边栏是否收起 */
      menuExpand: false,
      showLogo: true,
      /** 动态菜单：为空时侧边栏回退到 router.options.routes */
      routes: [] as RouteRecordRaw[],
    };
  },
  actions: {
    setMenuExpand() {
      this.menuExpand = !this.menuExpand;
    },
    setMenus(routes: RouteRecordRaw[]) {
      this.routes = routes;
    },
  },
});
