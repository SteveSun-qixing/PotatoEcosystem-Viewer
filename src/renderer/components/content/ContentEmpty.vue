<script setup lang="ts">
/**
 * ContentEmpty - 空状态组件（简洁版）
 */
import { useTranslation } from '@renderer/composables/useTranslation';

const { t } = useTranslation();
</script>

<template>
  <div class="content-empty">
    <p class="content-empty__hint">{{ t('content.empty.description') }}</p>
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
