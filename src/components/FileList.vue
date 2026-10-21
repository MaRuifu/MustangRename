<script setup lang="ts">
import { useFilesStore } from '../stores/files'
import type { FileItem } from '../types'

const files = useFilesStore()

function fmtSize(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)} MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)} GB`
}

function fmtTime(t: number): string {
  if (!t) return '-'
  const d = new Date(t)
  const p = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

function titleOf(it: FileItem): string {
  return `${it.path}\n大小：${fmtSize(it.size)}\n修改：${fmtTime(it.mtime)}\n创建：${fmtTime(it.ctime)}`
}
</script>

<template>
  <div class="filelist">
    <div v-if="!files.visible.length" class="empty">
      <div class="big">把文件或文件夹拖到这里</div>
      <div>支持同时拖入多个；也可在顶栏用「选择文件 / 选择文件夹」</div>
      <div v-if="files.items.length && files.filterText" class="hint">当前筛选条件下没有匹配的文件</div>
    </div>
    <template v-else>
      <div class="fhead">
        <span>原名称（{{ files.stats.total }}）</span>
        <span></span>
        <span>新名称</span>
        <span></span>
      </div>
      <div
        v-for="it in files.visible"
        :key="it.path"
        class="frow"
        :class="{ 'is-excluded': files.excluded.has(it.path) }"
        :title="titleOf(it)"
      >
        <span class="old">{{ it.name }}</span>
        <span class="arrow">→</span>
        <span class="new" :class="'s-' + (files.preview.get(it.path)?.status ?? 'same')">
          {{ files.preview.get(it.path)?.newName ?? it.name }}
          <em v-if="files.preview.get(it.path)?.error">{{ files.preview.get(it.path)?.error }}</em>
          <em v-else-if="files.preview.get(it.path)?.status === 'conflict'">重名冲突</em>
          <em v-else-if="files.excluded.has(it.path)" style="background: var(--panel-2); color: var(--text-3)">已排除</em>
        </span>
        <button
          class="iconbtn"
          :title="files.excluded.has(it.path) ? '恢复参与重命名' : '排除该文件'"
          @click="files.toggleExcluded(it.path)"
        >
          {{ files.excluded.has(it.path) ? '↺' : '✕' }}
        </button>
      </div>
    </template>
  </div>
</template>
