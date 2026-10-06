<template>
  <router-view v-slot="{ Component, route: currentRoute }">
    <keep-alive :include="keepAliveNames">
      <component
        :is="Component"
        v-if="
          Component && keepAliveNames.includes(String(currentRoute.name || ''))
        "
        :key="currentRoute.fullPath"
      />
    </keep-alive>
    <component
      :is="Component"
      v-if="
        Component && !keepAliveNames.includes(String(currentRoute.name || ''))
      "
      :key="currentRoute.fullPath"
    />
  </router-view>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { type LocationQuery, useRoute, useRouter } from "vue-router";

const route = useRoute();
const router = useRouter();
const excludedNames = ref<string[]>([]);

const keepAliveNames = computed(() => {
  const names = router
    .getRoutes()
    .filter((item) => item.meta?.keepAlive && item.name)
    .map((item) => String(item.name));
  if (!excludedNames.value.length) return names;
  return names.filter((name) => !excludedNames.value.includes(name));
});

const normalizeQuery = (query: LocationQuery) => {
  const rest = { ...query };
  delete rest.forceRefresh;
  return rest;
};

// 支持 /xxx?forceRefresh=xxx 强制刷新被缓存的页面
watch(route, (to) => {
  if (!to.query.forceRefresh) return;
  const name = to.name ? String(to.name) : "";
  if (!name) return;
  if (!excludedNames.value.includes(name)) {
    excludedNames.value = [...excludedNames.value, name];
  }
  nextTick(() => {
    excludedNames.value = excludedNames.value.filter((item) => item !== name);
    const query = normalizeQuery(to.query);
    if (to.name) {
      router
        .replace({
          name: to.name,
          params: to.params,
          query,
          hash: to.hash,
        })
        .catch(() => {});
    } else {
      router
        .replace({
          path: to.path,
          query,
          hash: to.hash,
        })
        .catch(() => {});
    }
  });
});
</script>
