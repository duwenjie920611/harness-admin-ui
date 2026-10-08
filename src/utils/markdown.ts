import MarkdownIt from "markdown-it";

// 模型返回的 HTML 只作为文字显示；链接使用解析器默认的协议校验。
const markdown = new MarkdownIt({ html: false, breaks: true, linkify: false });
const defaultLink = markdown.renderer.rules.link_open;
markdown.renderer.rules.link_open = (tokens, index, options, environment, renderer) => {
  tokens[index].attrSet("target", "_blank");
  tokens[index].attrSet("rel", "noopener noreferrer");
  return defaultLink ? defaultLink(tokens, index, options, environment, renderer)
    : renderer.renderToken(tokens, index, options);
};
// 表格独立横向滚动，长回复不会撑宽整个聊天页面。
markdown.renderer.rules.table_open = () => '<div class="markdown-table"><table>';
markdown.renderer.rules.table_close = () => "</table></div>";

export function renderMarkdown(content: string): string {
  return markdown.render(content);
}
