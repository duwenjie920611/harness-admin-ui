import { defineStore } from "pinia";
import type {
  LocationQuery,
  RouteMeta,
  RouteParamsGeneric,
  RouteRecordNameGeneric,
} from "vue-router";

/**
 * 标签页视图：只保留标签展示与跳转所需的字段。
 * 刻意不用 RouteLocationNormalized —— pinia 的 state 会先经过 Vue 的 UnwrapRef 深度展开，
 * 路由对象的 matched / redirect 由条件类型推导而来，展开后类型失真，取出来就赋不回原类型。
 */
export interface VisitedView {
  path: string;
  fullPath: string;
  name?: RouteRecordNameGeneric;
  query: LocationQuery;
  params: RouteParamsGeneric;
  hash: string;
  meta: RouteMeta;
  title?: string;
}

type CachedViewName = RouteRecordNameGeneric;

export const useTagViewStore = defineStore("tagView", {
  state: () => {
    return {
      visitedViews: [] as VisitedView[],
      cachedViews: [] as CachedViewName[],
    };
  },
  actions: {
    addView(view: VisitedView) {
      this.addVisitedView(view);
      this.addCachedView(view);
    },
    addVisitedView(view: VisitedView) {
      if (this.visitedViews.some((v) => v.path === view.path)) return;
      this.visitedViews.push({
        ...view,
        title: String(view.meta.title || "no-name"),
      });
    },
    addCachedView(view: VisitedView) {
      if (this.cachedViews.includes(view.name)) return;
      if (!view.meta.noCache) {
        this.cachedViews.push(view.name);
      }
    },

    delView(view: VisitedView) {
      this.delVisitedView(view);
      this.delCachedView(view);
      return {
        visitedViews: [...this.visitedViews],
        cachedViews: [...this.cachedViews],
      };
    },
    delVisitedView(view: VisitedView) {
      for (const [i, v] of this.visitedViews.entries()) {
        if (v.path === view.path) {
          this.visitedViews.splice(i, 1);
          break;
        }
      }
      return [...this.visitedViews];
    },
    delCachedView(view: VisitedView) {
      const index = this.cachedViews.indexOf(view.name);
      if (index > -1) {
        this.cachedViews.splice(index, 1);
      }
      return [...this.cachedViews];
    },

    delOthersViews(view: VisitedView) {
      this.delOthersVisitedViews(view);
      this.delOthersCachedViews(view);
      return {
        visitedViews: [...this.visitedViews],
        cachedViews: [...this.cachedViews],
      };
    },
    delOthersVisitedViews(view: VisitedView) {
      this.visitedViews = this.visitedViews.filter((v) => {
        return v.meta.affix || v.path === view.path;
      });
      return [...this.visitedViews];
    },
    delOthersCachedViews(view: VisitedView) {
      const index = this.cachedViews.indexOf(view.name);
      if (index > -1) {
        this.cachedViews = this.cachedViews.slice(index, index + 1);
      } else {
        this.cachedViews = [];
      }
      return [...this.cachedViews];
    },

    delAllViews() {
      this.delAllVisitedViews();
      return {
        visitedViews: [...this.visitedViews],
        cachedViews: [...this.cachedViews],
      };
    },
    delAllVisitedViews() {
      const affixTags = this.visitedViews.filter((tag) => tag.meta.affix);
      this.visitedViews = affixTags;
      return [...this.visitedViews];
    },
    delAllCachedViews() {
      this.cachedViews = [];
    },

    updateVisitedView(view: VisitedView) {
      for (const v of this.visitedViews) {
        if (v.path === view.path) {
          Object.assign(v, view);
          break;
        }
      }
    },
  },
});
