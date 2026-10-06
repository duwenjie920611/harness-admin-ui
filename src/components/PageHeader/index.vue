<template>
  <div class="section-container page-hero">
    <div class="hero-row">
      <div class="title-row">
        <el-icon v-if="showBack" class="back-icon" @click="handleBack">
          <ArrowLeft />
        </el-icon>
        <div>
          <div class="title-line">
            <div class="h2-title nowrap flex-vcenter flex">
              {{ title }}
            </div>
          </div>
          <div v-if="desc || $slots.desc" class="fc-44 mt-4">
            <slot name="desc">
              {{ desc }}
            </slot>
          </div>
        </div>
      </div>
      <div class="action-group">
        <slot name="actions" />
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useRouter } from "vue-router";
import { ArrowLeft } from "@element-plus/icons-vue";

type Props = {
  title: string;
  desc?: string;
  showBack?: boolean;
};

const { title, desc = "", showBack = false } = defineProps<Props>();
const router = useRouter();

const handleBack = () => {
  router.back();
};
</script>

<style scoped>
.page-hero {
  background: #ffffff;
  border: 1px solid var(--el-border-color-lighter);
}

.hero-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.hero-row > * + * {
  margin-left: 16px;
}

.title-row {
  display: flex;
  align-items: center;
  flex: 1;
}

.title-row > * + * {
  margin-left: 12px;
}

.title-line {
  display: flex;
  align-items: center;
}

.title-line > * + * {
  margin-left: 12px;
}

.back-icon {
  font-size: 24px;
  cursor: pointer;
  color: var(--el-text-color-primary);
}

.action-group {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.action-group > * + * {
  margin-left: 12px;
}

.action-group > * {
  margin-bottom: 8px;
}

@media (max-width: 960px) {
  .hero-row {
    flex-direction: column;
    align-items: flex-start;
  }

  .hero-row > * + * {
    margin-left: 0;
    margin-top: 12px;
  }
}
</style>
