<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import TopBar from './components/TopBar.vue'
import RulePanel from './components/RulePanel.vue'
import FileList from './components/FileList.vue'
import BottomBar from './components/BottomBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import AboutModal from './components/AboutModal.vue'
import { useFilesStore } from './stores/files'
import { useUiStore } from './stores/ui'
import { isTauri } from './composables/fs'
import { getCurrentWebview } from '@tauri-apps/api/webview'

const files = useFilesStore()
const ui = useUiStore()
const dragging = ref(false)

let unlisten: (() => void) | null = null

function onBrowserDragOver(e: DragEvent) {
  e.preventDefault()
  dragging.value = true
}
function onBrowserDragLeave(e: DragEvent) {
  if (e.relatedTarget === null) dragging.value = false
}
async function onBrowserDrop(e: DragEvent) {
  e.preventDefault()
  dragging.value = false
  if (e.dataTransfer) await files.addDataTransfer(e.dataTransfer)
}

onMounted(() => {
  // 主题覆盖：?theme=light/dark，或 localStorage('mr-theme')；缺省跟随系统
  const params = new URLSearchParams(window.location.search)
  const stored = localStorage.getItem('mr-theme')
  const theme = params.get('theme') ?? stored
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('mr-theme', theme)
  }
  // 开发模式演示种子：http://localhost:1420/?demo=1（仅截图/预览用，不进生产包）
  if (import.meta.env.DEV && params.has('demo')) {
    files.loadDemo()
  }
  if (isTauri()) {
    getCurrentWebview()
      .onDragDropEvent(async (e) => {
        if (e.payload.type === 'enter' || e.payload.type === 'over') dragging.value = true
        else if (e.payload.type === 'leave') dragging.value = false
        else if (e.payload.type === 'drop') {
          dragging.value = false
          await files.addPaths(e.payload.paths)
        }
      })
      .then((fn) => (unlisten = fn))
  } else {
    window.addEventListener('dragover', onBrowserDragOver)
    window.addEventListener('dragleave', onBrowserDragLeave)
    window.addEventListener('drop', onBrowserDrop)
  }
})

onUnmounted(() => {
  unlisten?.()
  window.removeEventListener('dragover', onBrowserDragOver)
  window.removeEventListener('dragleave', onBrowserDragLeave)
  window.removeEventListener('drop', onBrowserDrop)
})
</script>

<template>
  <div class="app">
    <TopBar />
    <RulePanel />
    <FileList />
    <BottomBar />
    <div v-if="dragging" class="dropoverlay">
      <div class="box">松开以添加文件 / 文件夹</div>
    </div>
    <SettingsModal v-if="ui.settingsOpen" />
    <AboutModal v-if="ui.aboutOpen" />
    <div v-if="files.toast" class="toast">{{ files.toast }}</div>
  </div>
</template>
