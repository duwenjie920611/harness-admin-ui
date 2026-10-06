<template>
  <div class="container">
    <div class="main">
      <slot />
    </div>
  </div>
</template>
<script lang="ts">
export default {
  name: "AppContainer",
};
</script>
<style lang="scss" scoped>
.container {
  height: calc(100vh - var(--page-header-height));
  box-sizing: border-box;
  background: var(--ds-bg-page);
  .main {
    box-sizing: border-box;
    padding: 32px;
  }
}
</style>
