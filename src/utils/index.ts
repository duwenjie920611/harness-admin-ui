import { useUserStore } from "@/store/user";

/**
 * 按钮级权限判断，供 v-auth 指令与页面逻辑复用。
 * 未传 key 时视为不需要鉴权。
 */
export const isAuth = (key: string) => {
  if (!key) {
    return true;
  }
  const user = useUserStore();
  const functions = user.functions || {};
  return !!functions[key];
};
