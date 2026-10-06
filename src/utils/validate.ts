// 判断是否是链接
export const isExternal = (path: string) =>
  /^(https?:|mailto:|tel:)/.test(path);

// 表单必填项基础
export const requireCommon = (
  message: string = "此项必填",
  trigger: string | string[] = ["blur", "change"]
) => ({
  required: true,
  message,
  trigger,
});
