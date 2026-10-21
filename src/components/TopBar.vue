<script setup lang="ts">
import { open } from '@tauri-apps/plugin-dialog'
import { useFilesStore } from '../stores/files'
import { useAiStore } from '../stores/ai'
import { useUiStore } from '../stores/ui'
import { isTauri } from '../composables/fs'

const files = useFilesStore()
const ai = useAiStore()
const ui = useUiStore()

async function pickFiles() {
  const r = await open({ multiple: true, directory: false, title: '选择要重命名的文件' })
  if (r) await files.addPaths(Array.isArray(r) ? r : [r])
}

async function pickDir() {
  const r = await open({ multiple: true, directory: true, title: '选择文件夹' })
  if (r) await files.addPaths(Array.isArray(r) ? r : [r])
}
</script>

<template>
  <header class="topbar">
    <div class="brand">
      <span class="logo">M</span>
      <div>
        <h1>马上改名</h1>
        <p>MustangRename · 批量重命名工具</p>
      </div>
    </div>
    <div class="spacer"></div>
    <label class="check" title="扫描文件夹时是否包含子目录">
      <input type="checkbox" v-model="files.scanOpts.recursive" @change="files.rescan()" />
      包含子目录
    </label>
    <label class="check" title="是否显示以 . 开头的隐藏文件">
      <input type="checkbox" v-model="files.scanOpts.includeHidden" @change="files.rescan()" />
      显示隐藏文件
    </label>
    <button v-if="isTauri()" class="btn" @click="pickFiles">选择文件</button>
    <button v-if="isTauri()" class="btn" @click="pickDir">选择文件夹</button>
    <button class="btn" :disabled="!files.items.length" @click="files.clear()">清空</button>
    <button class="btn" :disabled="!files.logs.length || files.busy" @click="files.undo()">
      撤销
    </button>
    <button class="btn" :class="{ 'ai-on': ai.configured }" title="AI 智能重命名设置" @click="ui.settingsOpen = true">
      ⚙ AI
    </button>
    <button class="btn" title="关于本软件" @click="ui.aboutOpen = true">ⓘ 关于</button>
  </header>
</template>

<style scoped>
.ai-on {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 600;
}
</style>
