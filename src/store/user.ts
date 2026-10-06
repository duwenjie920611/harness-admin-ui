import { defineStore } from "pinia";

export interface UserInfo {
  userCode?: string;
  userName?: string;
  nickName?: string;
  token?: string;
  [key: string]: unknown;
}

export interface IUserPermissions {
  /** 可见菜单 / 路由权限码 */
  menulist?: string[];
  /** 角色 */
  roles?: string[];
  /** 按钮级权限码 */
  functions?: Record<string, unknown>;
}

export const useUserStore = defineStore("user", {
  state: () => {
    return {
      userInfo: {} as UserInfo,
      token: "",
      menulist: [] as string[],
      roles: [] as string[],
      functions: {} as Record<string, unknown>,
    };
  },
  actions: {
    setUserInfo(userInfo: UserInfo) {
      this.userInfo = userInfo;
      this.userInfo.userCode = userInfo.userCode;
      this.userInfo.userName = userInfo.userName;
      this.userInfo.nickName = userInfo.nickName;
      if (userInfo.token) {
        this.token = userInfo.token;
      }
    },
    setToken(token: string) {
      this.token = token;
    },
    setRoles(roles: string[]) {
      this.roles = roles;
    },
    setFunctions(functions: Record<string, unknown> = {}) {
      this.functions = functions;
    },
    setUserPermissions(permissions?: IUserPermissions | null) {
      this.menulist = permissions?.menulist || [];
      this.functions = permissions?.functions || {};
      this.roles = permissions?.roles || [];
    },
    /** 退出登录：清空本地用户态，跳转由调用方决定 */
    resetUser() {
      this.userInfo = {};
      this.token = "";
      this.menulist = [];
      this.roles = [];
      this.functions = {};
    },
  },
});
