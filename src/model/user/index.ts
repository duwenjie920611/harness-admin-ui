/** 登录接口只返回展示信息，不返回密码。 */
export interface LoginUser {
  userId: string;
  username: string;
  displayName: string;
}

export interface CsrfToken {
  headerName: string;
  token: string;
}
