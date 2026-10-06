import type { RouteRecordRaw } from "vue-router";

/** 归一化路径：去掉末尾多余的 "/"，保证菜单与路由 meta.role 能对上 */
export const normalizePath = (path = "") => {
  if (!path || path === "/") {
    return path;
  }
  return path.endsWith("/") ? path.slice(0, -1) : path;
};

/**
 * 路由菜单权限判断：
 * 未声明 meta.role 的路由默认放行；声明了则要求命中用户菜单列表。
 * meta.role 可以是权限码，也可以是路径本身。
 */
export const hasRoutePermission = (
  route: Pick<RouteRecordRaw, "meta" | "path">,
  menus: string[]
) => {
  const role = route.meta?.role;
  if (!role) {
    return true;
  }

  const permissionKey =
    typeof role === "string" ? role : normalizePath(route.path);
  return menus.includes(normalizePath(permissionKey));
};
