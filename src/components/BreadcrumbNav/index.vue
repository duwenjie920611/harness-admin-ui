<template>
  <div class="breadcrumb-nav">
    <el-icon size="20" class="fc-44" @click="handleBack"><ArrowLeft /></el-icon>
    <div class="breadcrumb-list">
      <span
        v-for="(item, index) in items"
        :key="`${item}-${index}`"
        class="breadcrumb-item"
        :class="{ current: index === items.length - 1 }"
      >
        <span class="breadcrumb-text">{{ item }}</span>
        <span v-if="index < items.length - 1" class="breadcrumb-sep">/</span>
      </span>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import { ArrowLeft } from "@element-plus/icons-vue";

defineProps<{
  items: string[];
}>();

const router = useRouter();

const handleBack = () => {
  router.back();
};
</script>

<style scoped>
.breadcrumb-nav {
  display: flex;
  align-items: center;
}

.breadcrumb-nav > * + * {
  margin-left: 8px;
}

.breadcrumb-list {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.breadcrumb-item {
  display: inline-flex;
  align-items: center;
  color: rgba(0, 0, 0, 0.44);
  font-size: 14px;
}

.breadcrumb-item > * + * {
  margin-left: 6px;
}

.breadcrumb-item.current {
  color: rgba(0, 0, 0, 0.64);
}

.breadcrumb-sep {
  color: rgba(0, 0, 0, 0.44);
}
</style>
