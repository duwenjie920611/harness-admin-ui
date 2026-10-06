<template>
  <div class="app-wrapper">
    <AppSiderbar class="app-sidebar" />
    <div
      class="app-main"
      :class="{
        menu: !store.menuExpand,
        'menu-expand': store.menuExpand,
      }"
    >
      <div class="app-header">
        <AppHeader />
      </div>
      <AppTagViews v-if="setting.openTagView" />
      <app-container>
        <KeepAliveView />
      </app-container>
    </div>
  </div>
</template>
<script lang="ts" setup>
import {
  AppSiderbar,
  AppHeader,
  AppContainer,
  AppTagViews,
} from "./components";
import KeepAliveView from "@/router/view.vue";
import { useAppStore } from "@/store/app";
import setting from "@/plugins/setting";
import "./index.scss";

const store = useAppStore();
</script>
<style lang="scss">
.menu-expand {
  margin-left: var(--page-menu-collapse-width);
}

.menu {
  margin-left: var(--page-menu-width);
}
</style>
