<template>
  <div class="sidebar" :class="{ 'sidebar-expand': store.menuExpand }">
    <Logo v-if="store.showLogo" :collapse="store.menuExpand" />
    <el-scrollbar wrap-class="scrollbar-wrapper">
      <el-menu
        ref="menuRef"
        :default-active="activeMenu"
        :collapse="store.menuExpand"
        unique-opened
        :collapse-transition="false"
        :background-color="pageMenuBackground"
        :text-color="pageMenuTextColor"
        :active-text-color="pageMenuTextActiveColor"
      >
        <template v-for="routeItem in routes">
          <SidebarItem
            v-if="!routeItem.meta || !routeItem.meta.hidden"
            :key="routeItem.path"
            :item="routeItem"
            :base-path="routeItem.path"
            :menu-expand="store.menuExpand"
            is-first-level
          />
        </template>
      </el-menu>
    </el-scrollbar>
    <span class="expand-btn" @click="store.setMenuExpand">
      <el-icon v-if="!store.menuExpand"><ArrowLeft /></el-icon>
      <el-icon v-else><ArrowRight /></el-icon>
    </span>
  </div>
</template>
<script setup lang="ts">
import { computed, ref, watch, nextTick } from "vue";
import type { RouteRecordRaw } from "vue-router";
import { useRoute, useRouter } from "vue-router";
import { ArrowLeft, ArrowRight } from "@element-plus/icons-vue";
import { useAppStore } from "@/store/app";
import { useUserStore } from "@/store/user";
import { hasRoutePermission } from "@/utils/permission";
import Logo from "./Logo.vue";
import SidebarItem from "./SidebarItem.vue";

const store = useAppStore();
const userStore = useUserStore();
const route = useRoute();
const router = useRouter();
const menuRef = ref();

const activeMenu = computed(() => {
  const { meta, path } = route;
  return (meta.activeMenu as string) || path;
});

watch(activeMenu, (newActive) => {
  nextTick(() => {
    if (!menuRef.value || !newActive) return;
    // 打开当前激活项最深一层的父级子菜单，el-menu 会沿 indexPath 同步展开其全部祖先，
    // 从而支持二级 / 三级菜单的自动展开（避免 unique-opened 误收起父级分组）。
    const matched = router.resolve(newActive).matched;
    for (let i = matched.length - 2; i >= 0; i--) {
      const parentPath = matched[i]?.path;
      if (!parentPath || parentPath === "/") continue;
      try {
        menuRef.value.open(parentPath);
      } catch {
        // 该路径未注册为子菜单（如单层菜单项），忽略即可
      }
      break;
    }
  });
});

const hiddenRouteNames = new Set<string>();
const hiddenRoutePaths = new Set<string>();

const collectHiddenRoutes = (routes: readonly RouteRecordRaw[]) => {
  routes.forEach((item) => {
    if (item.meta?.hidden) {
      if (item.name) hiddenRouteNames.add(String(item.name));
      hiddenRoutePaths.add(item.path);
    }
    if (item.children?.length) {
      collectHiddenRoutes(item.children);
    }
  });
};

collectHiddenRoutes(router.options.routes);

const applyHiddenMeta = (
  routes: readonly RouteRecordRaw[]
): RouteRecordRaw[] =>
  routes.map((item) => {
    const meta = { ...(item.meta || {}) };
    const isHidden =
      (item.name && hiddenRouteNames.has(String(item.name))) ||
      hiddenRoutePaths.has(item.path);
    if (isHidden) {
      meta.hidden = true;
    }
    return {
      ...item,
      meta,
      children: item.children ? applyHiddenMeta(item.children) : undefined,
    } as RouteRecordRaw;
  });

const filterRoutesByMenu = (
  routes: readonly RouteRecordRaw[],
  menus: string[]
) =>
  routes.reduce<RouteRecordRaw[]>((result, item) => {
    const children = item.children
      ? filterRoutesByMenu(item.children, menus)
      : undefined;
    const routeVisible = hasRoutePermission(item, menus);

    if (routeVisible || (children && children.length > 0)) {
      result.push({
        ...item,
        children,
      } as RouteRecordRaw);
    }

    return result;
  }, []);

const routes = computed(() => {
  const baseRoutes = store.routes.length
    ? (store.routes as RouteRecordRaw[])
    : router.options.routes;
  return applyHiddenMeta(filterRoutesByMenu(baseRoutes, userStore.menulist));
});

const rootCss = getComputedStyle(document.documentElement);
const pageMenuBackground = rootCss.getPropertyValue("--page-menu-background");
const pageMenuTextColor = rootCss.getPropertyValue("--page-menu-text-color");
const pageMenuTextActiveColor = rootCss.getPropertyValue(
  "--page-menu-text-active-color"
);
</script>

<style scoped lang="scss">
.sidebar {
  font-size: 14px;
  display: flex;
  flex-direction: column;
  height: 100%;

  .el-menu {
    --el-menu-base-level-padding: 15px;
    border: none;
    height: 100%;
    width: 100% !important;
    background-color: transparent !important;
  }

  .expand-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    position: absolute;
    bottom: 16px;
    right: 16px;
    z-index: 100;
    text-align: center;
    cursor: pointer;
    color: var(--ds-text-tertiary);
    background: var(--ds-bg-elevated);
    border: 1px solid var(--ds-border-light);
    transition: var(--ds-transition);
    &:hover {
      color: var(--ds-primary);
      background: var(--ds-primary-soft);
      border-color: var(--ds-primary-light);
    }
  }
}

.sidebar-expand {
  width: var(--page-menu-collapse-width) !important;
  .expand-btn {
    right: 50%;
    transform: translateX(50%);
  }
}
</style>
<style>
.scrollbar-wrapper {
  overflow-x: hidden !important;
  padding: 16px 12px 56px !important;
  box-sizing: border-box;
}

.sidebar-expand .scrollbar-wrapper {
  padding: 16px 8px 56px !important;
}
</style>
