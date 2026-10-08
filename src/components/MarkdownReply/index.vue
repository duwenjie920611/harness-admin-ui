<script setup lang="ts">
import { computed } from "vue";
import { renderMarkdown } from "@/utils/markdown";

const props = defineProps<{ content: string }>();
// 内容随 SSE 增量更新；未闭合的代码围栏也由 Markdown 解析器正常处理。
const rendered = computed(() => renderMarkdown(props.content));
</script>

<template>
  <!-- 只渲染关闭原始 HTML 的解析器输出，不直接渲染模型返回的 HTML。 -->
  <!-- eslint-disable-next-line vue/no-v-html -->
  <div class="markdown-reply" v-html="rendered" />
</template>

<style scoped>
.markdown-reply { width: 100%; min-width: 0; color: #293b33; font-size: 15px; line-height: 1.85; overflow-wrap: anywhere; }
.markdown-reply :deep(> :first-child) { margin-top: 0; }
.markdown-reply :deep(> :last-child) { margin-bottom: 0; }
.markdown-reply :deep(p) { margin: 0 0 14px; }
.markdown-reply :deep(h1), .markdown-reply :deep(h2), .markdown-reply :deep(h3),
.markdown-reply :deep(h4), .markdown-reply :deep(h5), .markdown-reply :deep(h6) { margin: 26px 0 12px; color: #20372b; font-weight: 650; line-height: 1.5; }
.markdown-reply :deep(h1) { font-size: 24px; }
.markdown-reply :deep(h2) { font-size: 21px; }
.markdown-reply :deep(h3) { font-size: 18px; }
.markdown-reply :deep(h4), .markdown-reply :deep(h5), .markdown-reply :deep(h6) { font-size: 16px; }
.markdown-reply :deep(ul), .markdown-reply :deep(ol) { margin: 12px 0 18px; padding-left: 25px; }
.markdown-reply :deep(li) { padding-left: 4px; margin: 5px 0; }
.markdown-reply :deep(li > p) { margin-bottom: 6px; }
.markdown-reply :deep(strong) { color: #243b2e; font-weight: 650; }
.markdown-reply :deep(a) { color: #2e7256; text-decoration: underline; text-underline-offset: 3px; }
.markdown-reply :deep(a:hover) { color: #174b37; }
.markdown-reply :deep(code) { padding: 2px 6px; border-radius: 5px; background: #eaf0eb; color: #335e49; font-family: ui-monospace, SFMono-Regular, Consolas, monospace; font-size: .88em; }
.markdown-reply :deep(pre) { max-width: 100%; margin: 16px 0; padding: 18px 20px; overflow-x: auto; border: 1px solid #dde6dd; border-radius: 12px; background: #f1f5f0; line-height: 1.65; tab-size: 4; }
.markdown-reply :deep(pre code) { padding: 0; background: transparent; color: #293b33; font-size: 13px; white-space: pre; overflow-wrap: normal; }
.markdown-reply :deep(blockquote) { margin: 16px 0; padding: 10px 16px; border-left: 3px solid #8eb29a; border-radius: 0 8px 8px 0; background: #f0f5ef; color: #657368; }
.markdown-reply :deep(blockquote p:last-child) { margin-bottom: 0; }
.markdown-reply :deep(hr) { margin: 24px 0; border: 0; border-top: 1px solid #dfe7dd; }
.markdown-reply :deep(.markdown-table) { max-width: 100%; overflow-x: auto; margin: 18px 0; border: 1px solid #dfe7dd; border-radius: 10px; }
.markdown-reply :deep(table) { width: 100%; border-collapse: collapse; font-size: 14px; }
.markdown-reply :deep(th), .markdown-reply :deep(td) { min-width: 100px; padding: 10px 14px; border-bottom: 1px solid #e3eae0; text-align: left; }
.markdown-reply :deep(th) { background: #edf3eb; color: #3d5c47; font-weight: 600; }
.markdown-reply :deep(tr:last-child td) { border-bottom: 0; }
.markdown-reply :deep(img) { display: block; max-width: 100%; height: auto; border-radius: 8px; }
@media (max-width: 640px) {
  .markdown-reply { font-size: 14px; }
  .markdown-reply :deep(pre) { padding: 14px; }
  .markdown-reply :deep(h1) { font-size: 21px; }
  .markdown-reply :deep(h2) { font-size: 19px; }
}
</style>
