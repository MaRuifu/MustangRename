<script setup lang="ts">
import { ref } from 'vue'
import FindReplacePanel from './panels/FindReplacePanel.vue'
import AiPanel from './panels/AiPanel.vue'
import InsertPanel from './panels/InsertPanel.vue'
import NumberingPanel from './panels/NumberingPanel.vue'
import ManualPanel from './panels/ManualPanel.vue'

type TabId = 'findReplace' | 'ai' | 'insert' | 'numbering' | 'manual'

const tabs: { id: TabId; label: string; d: string }[] = [
  {
    id: 'findReplace',
    label: '查找替换',
    d: 'M10.5 9.5 14 13 M6.5 11a4.5 4.5 0 1 1 0-9 4.5 4.5 0 0 1 0 9Z'
  },
  {
    id: 'ai',
    label: '智能重命名',
    d: 'M8 2l1.2 3.1L12.5 6.3 9.2 7.5 8 10.6 6.8 7.5 3.5 6.3 6.8 5.1 8 2Z M12.5 10l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z M4 11l.5 1.3 1.3.5-1.3.5L4 14.6l-.5-1.3-1.3-.5 1.3-.5L4 11Z'
  },
  { id: 'insert', label: '插入内容', d: 'M3 3h10v10H3Z M8 6v4 M6 8h4' },
  { id: 'numbering', label: '自动编号', d: 'M6 4h8 M6 8h8 M6 12h8 M2 3.5h1V6 M2 8h2L2 10h2 M2 12h2v1H2v1h2' },
  { id: 'manual', label: '手动编辑', d: 'M10.5 2.5l3 3L6 13l-3.5 1L3.5 10.5l7-8Z' }
]

const active = ref<TabId>('findReplace')
</script>

<template>
  <section class="rulepanel">
    <div class="tabs">
      <button
        v-for="t in tabs"
        :key="t.id"
        class="tab"
        :class="{ active: active === t.id }"
        @click="active = t.id"
      >
        <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round">
          <path :d="t.d" />
        </svg>
        {{ t.label }}
      </button>
    </div>
    <div class="panel-body">
      <FindReplacePanel v-if="active === 'findReplace'" />
      <AiPanel v-else-if="active === 'ai'" />
      <InsertPanel v-else-if="active === 'insert'" />
      <NumberingPanel v-else-if="active === 'numbering'" />
      <ManualPanel v-else />
    </div>
  </section>
</template>
