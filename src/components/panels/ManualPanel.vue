<script setup lang="ts">
import { ref } from 'vue'
import { useFilesStore } from '../../stores/files'
import { useRulesStore } from '../../stores/rules'

const files = useFilesStore()
const rules = useRulesStore()

const dragFrom = ref<number | null>(null)
const dragOver = ref<number | null>(null)

function valueOf(path: string): string {
  return rules.overrides[path] ?? ''
}

/* ---------- 拖拽排序 ---------- */
function onDragStart(i: number) {
  dragFrom.value = i
}
function onDragOver(e: DragEvent, i: number) {
  e.preventDefault()
  dragOver.value = i
}
function onDrop(i: number) {
  if (dragFrom.value !== null) files.moveItem(dragFrom.value, i)
  dragFrom.value = null
  dragOver.value = null
}
function onDragEnd() {
  dragFrom.value = null
  dragOver.value = null
}

/* ---------- 多行粘贴（Excel 列等） ---------- */
function onPaste(e: ClipboardEvent, idx: number) {
  const text = e.clipboardData?.getData('text') ?? ''
  if (!text.includes('\n')) return // 单行走默认输入
  e.preventDefault()
  const lines = text.split(/\r?\n/)
  const vis = files.visible
  const entries: [string, string][] = []
  let applied = 0
  for (let i = 0; i < lines.length; i++) {
    const row = vis[idx + i]
    if (!row) break
    entries.push([row.path, lines[i].trim()])
    applied++
  }
  rules.setOverrides(entries)
  files.showToast(`已按行粘贴 ${applied} 个名称${lines.length > applied ? `，其余 ${lines.length - applied} 行超出列表被忽略` : ''}`)
}
</script>

<template>
  <div>
    <div class="rule-row" style="margin-bottom: 10px">
      <span class="hint">
        拖拽行首 ⠿ 调整顺序（自动切换为「自定义顺序」，影响序号/编号）；在输入框中粘贴多行文本（如 Excel 复制的列）将自该行起向下批量填充。留空 = 跟随规则 / AI。
      </span>
      <div class="spacer"></div>
      <button class="btn small" :disabled="!Object.keys(rules.overrides).length" @click="rules.clearOverrides()">
        清空手动编辑
      </button>
    </div>
    <div v-if="!files.visible.length" class="hint">列表为空：请先拖入或选择文件。</div>
    <div
      v-for="(it, idx) in files.visible"
      :key="it.path"
      class="rule-row manual-row"
      :class="{ 'drag-over': dragOver === idx && dragFrom !== idx }"
      draggable="true"
      @dragstart="onDragStart(idx)"
      @dragover="onDragOver($event, idx)"
      @drop="onDrop(idx)"
      @dragend="onDragEnd"
    >
      <span class="grip" title="拖拽排序">⠿</span>
      <span class="idx">{{ idx + 1 }}</span>
      <span class="old" :title="it.path">{{ it.name }}</span>
      <span class="arrow">→</span>
      <input
        class="input grow"
        :value="valueOf(it.path)"
        :placeholder="files.preview.get(it.path)?.newName ?? it.name"
        @input="rules.setOverride(it.path, ($event.target as HTMLInputElement).value)"
        @paste="onPaste($event, idx)"
      />
      <button
        class="iconbtn"
        title="清除该文件的手动编辑"
        :disabled="valueOf(it.path) === ''"
        @click="rules.setOverride(it.path, '')"
      >
        ✕
      </button>
    </div>
  </div>
</template>

<style scoped>
.manual-row {
  cursor: default;
  border-radius: 6px;
  padding: 2px 4px;
}

.manual-row.drag-over {
  outline: 2px dashed var(--accent);
  outline-offset: -2px;
}

.grip {
  cursor: grab;
  color: var(--text-3);
  font-size: 13px;
  line-height: 1;
  flex: none;
}

.grip:active {
  cursor: grabbing;
}

.idx {
  width: 30px;
  text-align: right;
  color: var(--text-3);
  font-size: 11px;
  font-family: var(--mono);
  flex: none;
}

.old {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--text-2);
  font-family: var(--mono);
  font-size: 12px;
}
</style>
