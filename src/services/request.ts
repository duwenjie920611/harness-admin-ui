import axios from "axios";
import type { AxiosInstance, AxiosRequestConfig } from "axios";
import { ElMessage } from "element-plus";
import { getActivePinia } from "pinia";
import { API_HOST } from "@/environment";
import { useUserStore } from "@/store/user";

/** 后端统一响应结构 */
export interface ResponseData<T = unknown> {
  /** 业务状态码，200 / 0 视为成功 */
  code: number;
  data: T;
  message: string;
}

export type RequestOptions = AxiosRequestConfig & {
  /** 下载类接口，跳过业务 code 校验 */
  blob?: boolean;
};

/** 网络连接异常提示码 */
const HTTP_CONNECT_FAIL_CODE = "3-10001";

/** HTTP 状态码 -> 用户可读提示 */
const HTTP_ERROR_MESSAGE: Record<number, string> = {
  404: "服务暂不可用，请联系技术支持(404)",
  500: "服务器内部错误，请联系技术支持(500)",
  502: "网关错误，请稍后再试(502)",
  503: "服务暂不可用，请稍后再试(503)",
  504: "服务器响应超时，请稍后再试(504)",
};

const getToken = () => {
  const pinia = getActivePinia();
  if (!pinia) {
    return "";
  }
  return useUserStore(pinia).token || "";
};

/** 请求被主动取消时不再弹错误提示 */
const isCanceled = (error: unknown) => {
  const maybeError = error as {
    code?: string;
    name?: string;
    message?: string;
    __CANCEL__?: boolean;
  };
  return (
    axios.isCancel?.(error) ||
    maybeError?.code === "ERR_CANCELED" ||
    maybeError?.name === "CanceledError" ||
    maybeError?.__CANCEL__ === true ||
    String(maybeError?.message || "")
      .toLowerCase()
      .includes("canceled")
  );
};

const service: AxiosInstance = axios.create({
  baseURL: API_HOST,
  timeout: 30000,
});

service.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers["token"] = token;
  }
  return config;
});

service.interceptors.response.use(
  (response) => {
    // 文件流不参与业务 code 校验，直接透传
    if (response.config.responseType === "blob") {
      return response.data;
    }

    const data = response.data as ResponseData;
    const isValid = data.code === 200 || data.code === 0;
    if (!isValid) {
      const message = data.message || "接口错误";
      ElMessage.error(message);
      return Promise.reject(new Error(message));
    }
    return data.data;
  },
  (error) => {
    if (isCanceled(error)) {
      return Promise.reject(error);
    }

    const status = error?.response?.status;
    ElMessage.error(
      HTTP_ERROR_MESSAGE[status] ||
        `网络错误，请稍后再试(${HTTP_CONNECT_FAIL_CODE})`
    );
    return Promise.reject(error);
  }
);

const normalizeOptions = ({
  blob,
  ...options
}: RequestOptions = {}): AxiosRequestConfig =>
  blob ? { ...options, responseType: "blob" } : options;

/**
 * 统一请求出口。业务接口在 src/api 下封装成具名函数，页面只调用函数。
 *
 *   export const queryExampleList = request.POST<IList, IQueryBody>("/example/list");
 *   const list = await queryExampleList({ pageNum: 1 });
 */
export const request = {
  GET:
    <T, P = unknown>(url: string) =>
    (params?: P, options?: RequestOptions) =>
      service.get(url, {
        params,
        ...normalizeOptions(options),
      }) as unknown as Promise<T>,

  POST:
    <T, B = unknown>(url: string) =>
    (body?: B, options?: RequestOptions) =>
      service.post(url, body, normalizeOptions(options)) as unknown as Promise<T>,

  PUT:
    <T, B = unknown>(url: string) =>
    (body?: B, options?: RequestOptions) =>
      service.put(url, body, normalizeOptions(options)) as unknown as Promise<T>,

  DELETE:
    <T, P = unknown>(url: string) =>
    (params?: P, options?: RequestOptions) =>
      service.delete(url, {
        params,
        ...normalizeOptions(options),
      }) as unknown as Promise<T>,
};

export default request;
