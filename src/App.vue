<template>
  <div class="admin-template">
    <el-config-provider :locale="zhCn">
      <router-view />
    </el-config-provider>
  </div>
</template>
<script setup lang="ts">
import zhCn from "element-plus/es/locale/lang/zh-cn";
</script>
<style>
#app,
.admin-template {
  min-height: 100vh;
}

#app {
  font-family: var(--ds-font-family);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: transparent;
  color: #0f172a;
}

html,
body,
#app {
  margin: 0;
}

html,
body {
  background: #f0f4f8;
}
</style>
