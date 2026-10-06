<script lang="ts">
export default {
  name: "RedirectView",
  created() {
    const { params, query } = this.$route;
    const { path } = params;
    this.$router.replace({ path: "/" + path, query });
  },
};
</script>
<template>
  <span></span>
</template>
