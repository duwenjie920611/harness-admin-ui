<template>
  <el-scrollbar
    ref="scrollContainerRef"
    :vertical="false"
    class="scroll-container"
  >
    <slot />
  </el-scrollbar>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  getCurrentInstance,
  onBeforeUnmount,
} from "vue";
import type { ComponentPublicInstance } from "vue";

const emits = defineEmits(["scroll"]);
const tagAndTagSpacing = 4;
const scrollContainerRef = ref<{
  $el: HTMLElement;
  wrapRef: HTMLElement;
}>();
const scrollWrapper = computed(() => scrollContainerRef.value?.wrapRef);
const parent = getCurrentInstance()?.parent;

type TagInstance = ComponentPublicInstance & {
  to: {
    path: string;
    fullPath: string;
  };
};

onMounted(() => {
  scrollWrapper.value?.addEventListener("scroll", emitScroll, true);
});

function emitScroll() {
  emits("scroll");
}

function moveToTarget(currentTag: TagInstance) {
  if (!scrollContainerRef.value || !scrollWrapper.value || !parent) return;
  const $container = scrollContainerRef.value.$el;
  const $containerWidth = $container.offsetWidth;
  const $scrollWrapper = scrollWrapper.value;
  const tagRefs = parent.refs.tagRefs;
  const tagList = Array.isArray(tagRefs)
    ? (tagRefs as TagInstance[])
    : ([tagRefs] as TagInstance[]);
  let firstTag: TagInstance | null = null;
  let lastTag: TagInstance | null = null;
  if (tagList.length > 0) {
    firstTag = tagList[0];
    lastTag = tagList[tagList.length - 1];
  }

  if (firstTag === currentTag) {
    $scrollWrapper.scrollLeft = 0;
  } else if (lastTag === currentTag) {
    $scrollWrapper.scrollLeft = $scrollWrapper.scrollWidth - $containerWidth;
  } else {
    const currentIndex = tagList.findIndex((item) => item === currentTag);
    const prevTag = tagList[currentIndex - 1];
    const nextTag = tagList[currentIndex + 1];

    const afterNextTagOffsetLeft =
      nextTag.$el.offsetLeft + nextTag.$el.offsetWidth + tagAndTagSpacing;

    const beforePrevTagOffsetLeft = prevTag.$el.offsetLeft - tagAndTagSpacing;

    if (afterNextTagOffsetLeft > $scrollWrapper.scrollLeft + $containerWidth) {
      $scrollWrapper.scrollLeft = afterNextTagOffsetLeft - $containerWidth;
    } else if (beforePrevTagOffsetLeft < $scrollWrapper.scrollLeft) {
      $scrollWrapper.scrollLeft = beforePrevTagOffsetLeft;
    }
  }
}

defineExpose({
  moveToTarget,
});

onBeforeUnmount(() => {
  scrollWrapper.value?.removeEventListener("scroll", emitScroll);
});
</script>

<style lang="scss" scoped>
.scroll-container {
  white-space: nowrap;
  position: relative;

  :deep(.el-scrollbar__bar) {
    bottom: 0px;
  }

  :deep(.el-scrollbar__wrap) {
    height: 34px;
  }

  :deep(.el-scrollbar__bar.is-horizontal) {
    height: 3px;
  }
}
</style>
