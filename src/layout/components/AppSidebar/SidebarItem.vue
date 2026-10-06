<!-- eslint-disable vue/require-component-is -->
<template>
  <!-- 一个子路由的情况 -->
  <div v-if="showOneChild" class="sider-item">
    <sidebar-item-link
      v-if="theOnlyOneChild.meta"
      :to="resolvePath(theOnlyOneChild.path)"
    >
      <el-menu-item
        :index="resolvePath(theOnlyOneChild.path)"
        :class="{ 'submenu-title-noDropdown': isFirstLevel }"
      >
        <el-icon class="menu-icon">
          <component :is="theOnlyOneChild.meta.icon" />
        </el-icon>
        <template #title>
          <span v-if="theOnlyOneChild.meta.title">
            {{ theOnlyOneChild.meta.title }}
          </span>
        </template>
      </el-menu-item>
    </sidebar-item-link>
  </div>
  <el-sub-menu v-else-if="!isHidden" :index="resolvePath(item.path)">
    <template #title>
      <el-icon v-if="item.meta && item.meta.icon" class="menu-icon">
        <component :is="item.meta.icon" />
      </el-icon>
      <span v-if="item.meta && item.meta.title">{{ item.meta.title }}</span>
    </template>
    <template v-if="item.children">
      <sidebar-item
        v-for="child in item.children"
        :key="child.path"
        :item="child"
        :menu-expand="menuExpand"
        :is-first-level="false"
        :base-path="resolvePath(child.path)"
        class="nest-menu"
      />
    </template>
  </el-sub-menu>
</template>
<script setup lang="ts">
import { computed } from "vue";
import type { RouteRecordRaw } from "vue-router";
import { isExternal } from "@/utils/validate";
import SidebarItemLink from "./SidebarItemLink.vue";

const props = defineProps<{
  item: RouteRecordRaw;
  menuExpand: boolean;
  isFirstLevel?: boolean;
  basePath: string;
}>();

const alwaysShowRootMenu = computed(() => props.item.meta?.alwaysShow);
const isHidden = computed(() => props.item.meta?.hidden);
const showingChildNumber = computed(() => {
  if (props.item.children) {
    const showingChildren = props.item.children.filter((child) => {
      return child.meta?.hidden ? false : true;
    });
    return showingChildren.length;
  } else {
    return 0;
  }
});

const showOneChild = computed(() => {
  return (
    !isHidden.value &&
    !alwaysShowRootMenu.value &&
    !!theOnlyOneChild.value &&
    !theOnlyOneChild.value.children
  );
});

const theOnlyOneChild = computed(() => {
  if (showingChildNumber.value > 1) {
    return null;
  }
  if (props.item.children) {
    for (const child of props.item.children) {
      if (!child.meta || !child.meta.hidden) {
        return child;
      }
    }
  }
  return { ...props.item, path: "" };
});

function resolvePath(routePath: string) {
  if (isExternal(routePath)) {
    return routePath;
  }
  if (routePath.startsWith("/")) {
    return routePath;
  }
  if (isExternal(props.basePath)) {
    return props.basePath;
  }
  if (!routePath) {
    return props.basePath;
  }
  return (
    props.basePath +
    (props.basePath.endsWith("/") ? routePath : "/" + routePath)
  );
}
</script>

<style lang="scss">
.menu-icon {
  margin-right: 12px;
  min-width: 1em;
  line-height: 1;
  font-size: 18px;
  color: var(--ds-text-tertiary);
  transition: color 0.2s ease, margin 0.2s ease;
}

.sidebar-expand .menu-icon {
  margin-right: 0;
}

.sidebar {
  .el-menu-item,
  .el-sub-menu__title {
    border-radius: var(--ds-radius-control) !important;
    height: 44px !important;
    line-height: 44px !important;
    margin: 4px 0;
    font-size: var(--ds-font-body);
    font-weight: 500;
    color: var(--ds-text-regular) !important;
    transition: background-color 0.2s ease, color 0.2s ease,
      box-shadow 0.2s ease;
  }

  .el-menu-item:hover,
  .el-sub-menu__title:hover {
    background-color: var(--page-menu-hover-background) !important;
    color: var(--page-menu-text-hover-color) !important;
    .menu-icon {
      color: var(--ds-primary);
    }
  }

  .el-sub-menu {
    width: 100%;
    overflow: hidden;
    .el-menu {
      background-color: transparent !important;
    }
  }

  /* 展开子菜单的内联容器建立 BFC，使子项纵向 margin 被包含其中，
     避免 ElCollapseTransition 读取的 scrollHeight 比最终 auto 高度短，
     从而消除展开结束时的高度跳变（上下抖动）。flow-root 不裁剪子项阴影。 */
  .el-menu--inline {
    display: flow-root;
  }
}

.sidebar:not(.sidebar-expand) .submenu-title-noDropdown {
  &::after {
    content: "";
    flex-shrink: 0;
    width: var(--el-menu-icon-width);
  }
}

.sidebar-expand .submenu-title-noDropdown {
  justify-content: center;
  padding-left: 0 !important;
  padding-right: 0 !important;

  .el-menu-tooltip__trigger {
    justify-content: center;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }
}

.sider-item {
  margin: 2px 0;
}

.sidebar .el-menu-item.is-active {
  background-color: var(--page-menu-active-background) !important;
  color: var(--page-menu-text-active-color) !important;
  font-weight: 600;
  box-shadow: 0 2px 6px rgba(37, 99, 235, 0.16);
  .menu-icon {
    color: #fff;
  }
}

/* 悬停激活项时保持激活态高亮，避免被通用 hover 规则覆盖成浅色 */
.sidebar .el-menu-item.is-active:hover {
  background-color: var(--page-menu-active-background) !important;
  color: var(--page-menu-text-active-color) !important;
  .menu-icon {
    color: #fff;
  }
}
</style>
