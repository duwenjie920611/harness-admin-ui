import { ref } from "vue";
import type { LoginUser, CsrfToken } from "@/model/user";

export const currentUser = ref<LoginUser | null>(null);
let csrf: CsrfToken | null = null;
let csrfRequest: Promise<CsrfToken> | null = null;

/** 令牌仅在内存中保存，登录后重新获取，Cookie 由浏览器管理。 */
async function csrfToken(): Promise<CsrfToken> {
  if (csrf) {
    return csrf;
  }
  if (!csrfRequest) {
    csrfRequest = fetch("/api/auth/csrf", {
      method: "POST", credentials: "same-origin", signal: AbortSignal.timeout(10000),
    }).then(async response => {
      if (!response.ok) {
        throw new Error("无法连接登录服务，请确认后端已启动");
      }
      csrf = await response.json() as CsrfToken;
      return csrf;
    }).finally(() => { csrfRequest = null; });
  }
  return csrfRequest;
}

/** 包含 SSE 在内的请求统一携带登录 Cookie 和 CSRF 校验头。 */
export async function authFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = await csrfToken();
  const headers = new Headers(options.headers);
  headers.set(token.headerName, token.token);
  const response = await fetch(path, { ...options, headers, credentials: "same-origin" });
  if (response.status === 401 && path !== "/api/auth/login") {
    currentUser.value = null;
    csrf = null;
    window.location.hash = "#/login";
    throw new Error("登录已失效，请重新登录");
  }
  if (response.status === 403) {
    csrf = null;
  }
  return response;
}

export async function restoreUser(): Promise<LoginUser> {
  const response = await authFetch("/api/auth/me", { method: "POST" });
  if (!response.ok) {
    throw new Error("无法查询登录状态");
  }
  currentUser.value = await response.json() as LoginUser;
  return currentUser.value;
}

export async function login(username: string, password: string): Promise<void> {
  const response = await authFetch("/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    throw new Error(response.status === 401 ? "用户名或密码错误，或账号已停用" : "登录失败，请刷新后重试");
  }
  currentUser.value = await response.json() as LoginUser;
  csrf = null;
  await csrfToken();
}

export async function logout(): Promise<void> {
  const response = await authFetch("/api/auth/logout", { method: "POST" });
  if (!response.ok) {
    throw new Error("退出失败，请重试");
  }
  currentUser.value = null;
  csrf = null;
}
