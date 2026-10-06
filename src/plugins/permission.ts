import type { App, DirectiveBinding } from "vue";
import type { Router } from "vue-router";
import { useUserStore } from "@/store/user";
import { isAuth } from "@/utils";
import { hasRoutePermission } from "@/utils/permission";

const remove = (el: HTMLElement) => el.parentNode?.removeChild(el);

const updateDisabled = (el: HTMLElement, disabled: boolean) => {
  const target = el as HTMLButtonElement;
  target.disabled = disabled;
  target.setAttribute("aria-disabled", String(disabled));
  target.classList.toggle("is-disabled", disabled);
  target.style.pointerEvents = disabled ? "none" : "";
};

/**
 * v-auth 按钮级权限：
 * - v-auth="'code'"        无权限时移除元素
 * - v-auth.usable="'code'" 无权限时保留元素但置灰
 */
const applyAuth = (el: HTMLElement, binding: DirectiveBinding<string>) => {
  const hasAuth = isAuth(binding.value);

  if (binding.modifiers.usable) {
    updateDisabled(el, !hasAuth);
    return;
  }

  if (!hasAuth) {
    remove(el);
  }
};

export function registerAuthDirective(app: App) {
  app.directive("auth", {
    mounted: applyAuth,
    updated: applyAuth,
  });
}

/**
 * 路由级权限守卫。
 *
 * 未声明 meta.role 的路由始终放行；声明了则要求命中 userStore.menulist。
 * menulist 为空（未接入鉴权服务）时，所有带 meta.role 的路由都会被拦到 404，
 * 因此默认路由不声明 meta.role。接入真实鉴权后按需补充。
 */
export function permission(router: Router) {
  router.beforeEach((to, _from, next) => {
    const userStore = useUserStore();
    if (!hasRoutePermission(to, userStore.menulist)) {
      next("/404");
      return;
    }
    next();
  });
}
