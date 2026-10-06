<template>
  <div class="not-found">
    <div class="code">404</div>
    <div class="tip">页面不存在或暂无访问权限</div>
    <el-button type="primary" @click="goChat">返回聊天</el-button>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";

defineOptions({ name: "NoFoundPage" });

const router = useRouter();
const goChat = () => router.replace("/chat");
</script>

<style scoped>
.not-found {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
}

.code {
  font-size: 72px;
  font-weight: 700;
  color: var(--ds-primary);
  line-height: 1;
}

.tip {
  font-size: 14px;
  color: var(--ds-text-regular);
}
</style>
