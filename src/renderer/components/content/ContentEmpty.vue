<script setup lang="ts">
/**
 * ContentEmpty - 空状态组件（简洁版）
 */
</script>

<template>
  <div class="content-empty">
    <p class="content-empty__hint">拖放 .card 文件到此处</p>
  </div>
</template>

<style scoped>
.content-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  user-select: none;
}

.content-empty__hint {
  font-size: 15px;
  color: var(--hint-color, #999);
}

:global(.theme-dark) .content-empty {
  --hint-color: #666;
}

:global(.theme-light) .content-empty {
  --hint-color: #999;
}
</style>
