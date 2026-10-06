/**
 * 业务 API 示例。
 *
 * 每个接口封装成「具名函数工厂 + 出入参类型」，页面只依赖函数，不直接碰 axios。
 * 请求地址会拼接 src/environment 中的 API_HOST（开发态为 /api，由 vite 代理转发）。
 */
import request from "@/services/request";

export interface IQueryExampleListBody {
  /** 当前页 */
  pageNum: number;
  /** 每页条数 */
  pageSize: number;
  /** 关键字 */
  keyword?: string;
}

export interface IExampleListItem {
  /** 业务编码 */
  code: string;
  /** 业务名称 */
  name: string;
  /** 状态 */
  status: number;
}

export interface IQueryExampleListResponse {
  /** 列表数据 */
  list: IExampleListItem[];
  /** 总条数 */
  total: number;
}

/** 查询列表 */
export const queryExampleList = request.POST<
  IQueryExampleListResponse,
  IQueryExampleListBody
>("/example/list");

export interface IQueryExampleDetailBody {
  /** 业务编码 */
  code: string;
}

export interface IExampleDetail {
  /** 业务编码 */
  code: string;
  /** 业务名称 */
  name?: string;
  /** 创建人 */
  creatorName?: string;
}

/** 查询详情 */
export const queryExampleDetail = request.GET<IExampleDetail, IQueryExampleDetailBody>(
  "/example/detail"
);
