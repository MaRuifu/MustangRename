<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getVersion } from '@tauri-apps/api/app'
import { useUiStore } from '../stores/ui'
import { useFilesStore } from '../stores/files'
import { isTauri } from '../composables/fs'

const ui = useUiStore()
const files = useFilesStore()
const version = ref('0.1.0')

onMounted(async () => {
  if (isTauri()) {
    try {
      version.value = await getVersion()
    } catch {
      /* 保留默认值 */
    }
  }
})

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text)
    files.showToast(`已复制 ${text}`)
  } catch {
    files.showToast('复制失败，请手动选择文本')
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="ui.aboutOpen = false">
    <div class="modal about">
      <header>
        <h2>关于 马上改名</h2>
        <button class="iconbtn" @click="ui.aboutOpen = false">✕</button>
      </header>
      <div class="modal-body">
        <div class="hero">
          <span class="logo">M</span>
          <div>
            <div class="name">马上改名 <span class="ver">v{{ version }}</span></div>
            <div class="desc">MustangRename · 跨平台（macOS / Windows）批量重命名工具</div>
          </div>
        </div>
        <div class="rows">
          <div class="row"><span class="k">作者</span><span class="v">马瑞富</span></div>
          <div class="row">
            <span class="k">网站</span>
            <span class="v link" title="点击复制" @click="copy('https://maruifu.com')">maruifu.com</span>
          </div>
          <div class="row">
            <span class="k">邮箱</span>
            <span class="v link" title="点击复制" @click="copy('email@maruifu.cn')">email@maruifu.cn</span>
          </div>
          <div class="row"><span class="k">许可证</span><span class="v">MIT</span></div>
        </div>
        <div class="copy-line">© 2026 马瑞富 · 本项目开源，欢迎 Issue 与 PR</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  z-index: 80;
  background: rgba(10, 14, 20, 0.45);
  display: grid;
  place-items: center;
}

.modal {
  width: 420px;
  max-width: calc(100vw - 40px);
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
}

.modal header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border);
}

.modal header h2 {
  margin: 0;
  font-size: 15px;
}

.modal-body {
  padding: 18px;
}

.hero {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.logo {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  background: linear-gradient(135deg, #4d8dff, #2453e6);
  color: #fff;
  font-weight: 700;
  font-size: 22px;
  display: grid;
  place-items: center;
  flex: none;
}

.name {
  font-size: 15px;
  font-weight: 650;
}

.ver {
  font-size: 11px;
  color: var(--accent);
  background: var(--accent-soft);
  border-radius: 4px;
  padding: 1px 6px;
  margin-left: 6px;
  font-weight: 500;
}

.desc {
  font-size: 12px;
  color: var(--text-3);
  margin-top: 2px;
}

.rows {
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 6px 0;
}

.row {
  display: flex;
  align-items: center;
  padding: 6px 0;
  font-size: 12.5px;
}

.row .k {
  width: 64px;
  color: var(--text-3);
  flex: none;
}

.row .v {
  color: var(--text);
}

.row .link {
  color: var(--accent);
  cursor: pointer;
}

.row .link:hover {
  text-decoration: underline;
}

.copy-line {
  margin-top: 12px;
  font-size: 11.5px;
  color: var(--text-3);
  text-align: center;
}
</style>
