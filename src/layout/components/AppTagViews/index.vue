<template>
  <div id="tags-view-container" ref="tagViewRef" class="tags-view-container">
    <scroll-pane
      ref="scrollPaneRef"
      class="tags-view-wrapper"
      @scroll="handleScroll"
    >
      <div class="tag-view-box">
        <router-link
          ref="tagRefs"
          :to="{ path: '/', query: {} }"
          class="tags-view-home"
        >
          <el-icon><HomeFilled /></el-icon>
        </router-link>
        <router-link
          v-for="tag in visitedViews"
          ref="tagRefs"
          :key="tag.path"
          :class="isActive(tag) ? 'active' : ''"
          :to="{ path: tag.path, query: tag.query }"
          class="tags-view-item"
        >
          {{ tag.title }}
          <div class="active-tag-bar"></div>
          <el-icon
            v-if="!isAffix(tag)"
            class="delete-tag"
            @click.prevent.stop="closeSelectedTag(tag)"
          >
            <Close />
          </el-icon>
        </router-link>
      </div>
    </scroll-pane>
    <el-dropdown trigger="click" placement="bottom-end" @command="handleCommand">
      <span class="el-dropdown-link">
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </span>
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item command="refreshSelectedTag" :disabled="!selectedTag">
            刷新当前标签页
          </el-dropdown-item>
          <el-dropdown-item command="closeSelectedTag" :disabled="!selectedTag">
            关闭当前标签页
          </el-dropdown-item>
          <el-dropdown-item command="closeOthersTags">
            关闭其他标签页
          </el-dropdown-item>
          <el-dropdown-item command="closeAllTags">
            关闭所有标签页
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  watch,
  ref,
  shallowRef,
  nextTick,
  onMounted,
  type ComponentPublicInstance,
} from "vue";
import {
  type RouteLocationNormalized,
  type RouteRecordRaw,
  type RouterLink,
  useRoute,
  useRouter,
} from "vue-router";
import { ArrowDown, Close, HomeFilled } from "@element-plus/icons-vue";
import ScrollPane from "./ScrollPane.vue";
import { useTagViewStore } from "@/store/tagView";
import type { VisitedView } from "@/store/tagView";

type TagView = RouteLocationNormalized | VisitedView;
// router-link 实例类型里没有 to，这里补上供 ScrollPane 定位使用
type RouterLinkInstance = InstanceType<typeof RouterLink> &
  ComponentPublicInstance & {
    to: { path: string; fullPath: string };
  };
type ScrollPaneInstance = InstanceType<typeof ScrollPane>;

const tagRefs = ref<RouterLinkInstance | RouterLinkInstance[]>();
const tagViewRef = ref<HTMLElement>();
const scrollPaneRef = ref<ScrollPaneInstance>();
// 用 shallowRef：路由对象无需深度响应式，同时避免 ref 的 UnwrapRef 让路由类型失真
const selectedTag = shallowRef<TagView | null>(null);
const affixTags = ref<VisitedView[]>([]);
const route = useRoute();
const router = useRouter();
const tagViewStore = useTagViewStore();
const visitedViews = computed(() => tagViewStore.visitedViews);
const routes = computed(() => router.options.routes);

onMounted(() => {
  initTags();
  selectedTag.value = route;
});
watch(route, () => {
  addTags();
  moveToCurrentTag();
  selectedTag.value = route;
});

function isActive(currentroute: TagView) {
  return currentroute.path === route.path;
}
function isAffix(tag: TagView | null) {
  return tag?.meta && tag.meta.affix;
}
function filterAffixTags(
  routes: readonly RouteRecordRaw[],
  basePath = "/"
): VisitedView[] {
  let tags: VisitedView[] = [];
  routes.forEach((item) => {
    if (item.meta && item.meta.affix) {
      const tagPath = [basePath, item.path].join("");
      tags.push({
        fullPath: tagPath,
        path: tagPath,
        name: item.name,
        meta: { ...item.meta },
        title: String(item.meta.title || "no-name"),
        query: {},
        params: {},
        hash: "",
      });
    }
    if (item.children) {
      const tempTags = filterAffixTags(item.children, item.path);
      if (tempTags.length >= 1) {
        tags = [...tags, ...tempTags];
      }
    }
  });
  return tags;
}
function initTags() {
  const affixTagList = (affixTags.value = filterAffixTags(routes.value));
  for (const tag of affixTagList) {
    // Must have tag name
    if (tag.name) {
      tagViewStore.addVisitedView(tag);
    }
  }
}
function addTags() {
  const { name } = route;
  if (name) {
    tagViewStore.addView(route);
  }
  return false;
}
function moveToCurrentTag() {
  const tags = tagRefs.value;
  nextTick(() => {
    if (tags) {
      for (const tag of Array.isArray(tags) ? tags : [tags]) {
        if (tag.to.path === route.path) {
          scrollPaneRef.value?.moveToTarget(tag);
          if (tag.to.fullPath !== route.fullPath) {
            tagViewStore.updateVisitedView(route);
          }
          break;
        }
      }
    }
  });
}
function refreshSelectedTag() {
  if (!selectedTag.value) return;
  tagViewStore.delCachedView(selectedTag.value);
  const target = selectedTag.value;
  nextTick(() => {
    router
      .replace({
        path: target.path,
        query: {
          ...target.query,
          forceRefresh: String(Date.now()),
        },
        hash: target.hash,
      })
      .catch(() => {});
  });
}
function closeSelectedTag(view: TagView) {
  const { visitedViews } = tagViewStore.delView(view);
  if (isActive(view)) {
    toLastView(visitedViews, view);
  }
}
function closeOthersTags() {
  if (!selectedTag.value) return;
  router.push(selectedTag.value);
  tagViewStore.delOthersViews(selectedTag.value);
  moveToCurrentTag();
}
function closeAllTags() {
  if (!selectedTag.value) return;
  const { visitedViews } = tagViewStore.delAllViews();
  if (affixTags.value.some((tag) => tag.path === selectedTag.value?.path)) {
    return;
  }
  toLastView(visitedViews, selectedTag.value);
}
function toLastView(visitedViews: VisitedView[], view: TagView) {
  const latestView = visitedViews.slice(-1)[0];
  if (latestView) {
    router.push(latestView.fullPath);
  } else {
    if (view.name === "Home") {
      router.replace({ path: "/redirect" + view.fullPath });
    } else {
      router.push("/");
    }
  }
}

function handleCommand(command: string) {
  switch (command) {
    case "refreshSelectedTag":
      refreshSelectedTag();
      break;
    case "closeSelectedTag":
      if (selectedTag.value) closeSelectedTag(selectedTag.value);
      break;
    case "closeOthersTags":
      closeOthersTags();
      break;
    case "closeAllTags":
      closeAllTags();
      break;
  }
}

function handleScroll() {
  // 预留：标签栏横向滚动时的联动处理
}
</script>

<style lang="scss" scoped>
.tags-view-container {
  height: 34px;
  box-sizing: border-box;
  background: #ffffff;
  border-bottom: 1px solid var(--ds-border-light);
  padding: 0 10px;
  display: flex;
  align-items: center;

  .tags-view-wrapper {
    flex: 1;
    .tags-view-item {
      position: relative;
      display: inline-flex;
      min-width: 40px;
      text-align: center;
      color: #495060;
      font-size: 12px;
      margin-top: 3px;
      border-radius: 3px;
      height: 28px;
      align-items: center;
      line-height: 28px;
      align-self: center;
      margin-right: 4px;
      padding: 0 6px;
      text-decoration: none;
      box-shadow: 0 0 1px #888;
      transition: all 0.3s;
      &:last-of-type {
        margin-right: 15px;
      }

      &:first-of-type {
        margin-left: 5px;
      }

      &.active {
        color: var(--el-color-primary);
        border-color: #484d6d;
        &::before {
          content: "";
          background: #fff;
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          position: relative;
          margin-right: 2px;
        }
        .active-tag-bar {
          position: absolute;
          left: 0;
          bottom: 0;
          height: 2px;
          width: 100%;
          background: var(--el-color-primary);
        }
        .delete-tag {
          width: 10px;
        }
      }
      &:hover {
        color: var(--el-color-primary);
        .delete-tag {
          width: 10px;
        }
      }
    }
    .tags-view-home {
      width: 30px;
      display: inline-block;
      position: relative;
      top: 2px;
      left: 2px;
      color: #495060;
    }
    .active-tag-bar {
      position: absolute;
      left: 0;
      bottom: 0;
      height: 2px;
      width: 0%;
      transition: all 0.3s;
    }
    .delete-tag {
      transition: all 0.3s;
      padding: 0 4px;
      width: 0;
    }
  }
}
</style>

<style lang="scss">
//reset element css of el-icon-close
.tags-view-wrapper {
  .tags-view-item {
    .el-icon-close {
      width: 16px;
      height: 16px;
      vertical-align: 2px;
      border-radius: 50%;
      text-align: center;
      transition: all 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
      transform-origin: 100% 50%;

      &:before {
        transform: scale(1);
        display: inline-block;
        vertical-align: -3px;
      }

      &:hover {
        background-color: #b4bccc;
        color: #fff;
      }
    }
  }
}
</style>
