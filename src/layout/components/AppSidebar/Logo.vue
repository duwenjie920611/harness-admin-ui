<template>
  <div class="logo-container">
    <div class="logo-mark">H</div>
    <span v-if="!collapse" class="logo-text">harness-admin</span>
  </div>
</template>
<script setup lang="ts">
defineProps<{ collapse?: boolean }>();
</script>
<style lang="scss">
.logo-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  height: var(--page-header-height);
  border-bottom: 1px solid var(--ds-border-light);
  background: var(--ds-bg-card);
  overflow: hidden;

  .logo-mark {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: var(--ds-radius-small);
    background: var(--ds-primary);
    color: #fff;
    font-size: 16px;
    font-weight: 700;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .logo-text {
    font-size: 15px;
    font-weight: 600;
    color: var(--ds-text-primary);
    white-space: nowrap;
  }
}
</style>
