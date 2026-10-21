<script setup lang="ts">
import { computed } from 'vue'
import { SORT_LABELS, useFilesStore } from '../stores/files'
import { isTauri } from '../composables/fs'
import type { FilterMode, SortKey } from '../types'

const files = useFilesStore()

const FILTERS: { value: FilterMode; label: string; ph: string }[] = [
  { value: 'all', label: '全部文件', ph: '' },
  { value: 'keyword', label: '关键字', ph: '名称包含…' },
  { value: 'ext', label: '扩展名', ph: '如 vue, ts, png' },
  { value: 'regex', label: '正则', ph: '如 ^IMG_\\d+' }
]

const filterPh = computed(() => FILTERS.find((f) => f.value === files.filterMode)?.ph ?? '')

const canExec = computed(
  () =>
    isTauri() &&
    !files.busy &&
    files.stats.selected > 0 &&
    files.stats.changed > 0 &&
    files.stats.conflicts === 0 &&
    files.stats.invalids === 0
)
</script>

<template>
  <footer class="bottombar">
    <select class="select" v-model="files.filterMode" title="筛选文件">
      <option v-for="f in FILTERS" :key="f.value" :value="f.value">筛选：{{ f.label }}</option>
    </select>
    <input
      v-if="files.filterMode !== 'all'"
      class="input filter"
      v-model="files.filterText"
      :placeholder="filterPh"
    />
    <select class="select" v-model="files.sortKey" title="排序方式（自动编号按此顺序）">
      <option v-for="(label, key) in SORT_LABELS" :key="key" :value="key">排序 - {{ label }}</option>
    </select>
    <span class="count">已选 {{ files.stats.selected }} / {{ files.stats.total }} 个文件</span>
    <span v-if="files.stats.conflicts" class="chip warn">{{ files.stats.conflicts }} 个重名冲突</span>
    <span v-if="files.stats.invalids" class="chip warn">{{ files.stats.invalids }} 个非法名称</span>
    <span v-if="files.scanning" class="hint">扫描中…</span>
    <div class="spacer"></div>
    <button class="btn primary" :disabled="!canExec" @click="files.execute()">▶ 执行重命名</button>
  </footer>
</template>
