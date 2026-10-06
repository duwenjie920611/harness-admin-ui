<template>
  <div class="header-container">
    <div class="header-common"></div>
    <div class="header-operate">
      <el-dropdown @command="handleCommand">
        <span class="el-dropdown-link">
          {{ userInfo.nickName || userInfo.userName || "未登录" }}
          <el-icon class="el-icon--right">
            <arrow-down />
          </el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">退出</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>
<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ArrowDown } from "@element-plus/icons-vue";
import { useUserStore } from "@/store/user";
import "./index.scss";

const userStore = useUserStore();
const router = useRouter();
const userInfo = computed(() => userStore.userInfo || {});

const handleCommand = (command: string | number | object) => {
  switch (command) {
    case "logout":
      // 接入真实登录后，这里替换为调用登出接口 + 跳转登录页
      userStore.resetUser();
      router.replace("/home");
      break;
  }
};
</script>
<style>
.header-operate {
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
