<template>
  <span>
    <el-tooltip
      v-if="isShowToolTip"
      placement="top-start"
      trigger="hover"
      raw-content
    >
      <template #content>
        <div
          class="overflow-tooltip-content"
          :style="{ maxWidth: tootipWidth ? `${tootipWidth}px` : '420px' }"
        >
          {{ contents }}
        </div>
      </template>
      <div class="overflow-text" :style="{ WebkitLineClamp: lineClamp }">
        {{ content }}
      </div>
    </el-tooltip>
    <span v-else>
      {{ content }}
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  content: string | number | null | undefined;
  tootipWidth?: number | null;
  lines?: number;
}>();

const contents = computed(() => {
  return `${props.content || ""}`;
});

const isShowToolTip = computed(() => {
  return props.content && typeof props.content === "string"
    ? props.content.length > 20
    : false;
});

const lineClamp = computed(() => String(props.lines || 3));
</script>

<style scoped>
.overflow-text {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: normal;
}

.overflow-tooltip-content {
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 20px;
}
</style>
