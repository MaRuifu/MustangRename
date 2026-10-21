<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useAiStore } from '../stores/ai'
import { useUiStore } from '../stores/ui'
import type { AiProtocol } from '../types'

const ai = useAiStore()
const ui = useUiStore()

const form = reactive({ ...ai.config })
const showKey = ref(false)
const status = ref<{ kind: 'ok' | 'err' | 'info'; text: string } | null>(null)
const fetching = ref(false)
const testing = ref(false)

const PROTOCOLS: { value: AiProtocol; label: string; hint: string }[] = [
  { value: 'openai-completions', label: 'openai-completions', hint: 'POST /chat/completions' },
  { value: 'openai-responses', label: 'openai-responses', hint: 'POST /responses' },
  { value: 'anthropic-messages', label: 'anthropic-messages', hint: 'POST /messages' }
]

function close() {
  ui.settingsOpen = false
}

function save() {
  ai.saveConfig({ ...form })
  status.value = { kind: 'ok', text: '已保存' }
}

async function fetchModels() {
  ai.saveConfig({ ...form })
  fetching.value = true
  status.value = { kind: 'info', text: '拉取模型列表中…' }
  try {
    const list = await ai.fetchModels()
    status.value = { kind: 'ok', text: `拉取到 ${list.length} 个模型` }
    if (list.length && !list.includes(form.model)) form.model = list[0]
  } catch (e) {
    status.value = { kind: 'err', text: `拉取失败：${String(e)}` }
  } finally {
    fetching.value = false
  }
}

async function test() {
  ai.saveConfig({ ...form })
  testing.value = true
  status.value = { kind: 'info', text: '测试链路中…' }
  try {
    const reply = await ai.testConnection()
    status.value = { kind: 'ok', text: `链路正常，模型回复：${reply}` }
  } catch (e) {
    status.value = { kind: 'err', text: `测试失败：${String(e)}` }
  } finally {
    testing.value = false
  }
}
</script>

<template>
  <div class="modal-mask" @click.self="close">
    <div class="modal">
      <header>
        <h2>AI 设置</h2>
        <button class="iconbtn" @click="close">✕</button>
      </header>

      <div class="modal-body">
        <div class="field">
          <label>配置名称</label>
          <input class="input" v-model="form.name" placeholder="如：公司网关 / 个人 Key" />
        </div>
        <div class="field">
          <label>协议类型</label>
          <select class="select" v-model="form.protocol">
            <option v-for="p in PROTOCOLS" :key="p.value" :value="p.value">{{ p.label }}（{{ p.hint }}）</option>
          </select>
        </div>
        <div class="field">
          <label>模型地址（Base URL）</label>
          <input
            class="input"
            v-model="form.baseUrl"
            placeholder="如 https://api.openai.com/v1 或 https://api.anthropic.com/v1"
          />
          <span class="hint">填写到版本前缀即可，工具会自动拼接 /chat/completions、/responses 或 /messages</span>
        </div>
        <div class="field">
          <label>API Key</label>
          <div class="keyrow">
            <input class="input grow" :type="showKey ? 'text' : 'password'" v-model="form.apiKey" placeholder="sk-…" />
            <label class="check"><input type="checkbox" v-model="showKey" /> 显示</label>
          </div>
          <span class="hint">仅保存在本机浏览器/应用本地（localStorage），不会上传到任何第三方</span>
        </div>
        <div class="field">
          <label>模型</label>
          <input class="input" v-model="form.model" list="mr-models" placeholder="选择或手动填写模型名" />
          <datalist id="mr-models">
            <option v-for="m in ai.models" :key="m" :value="m"></option>
          </datalist>
          <div class="btnrow">
            <button class="btn small" :disabled="fetching" @click="fetchModels">
              {{ fetching ? '拉取中…' : '拉取模型列表' }}
            </button>
            <button class="btn small" :disabled="testing" @click="test">
              {{ testing ? '测试中…' : '测试链路' }}
            </button>
          </div>
          <span class="hint">请求路径：开发期经 dev 服务器代理、桌面正式版经本地 Rust 代理，均不受浏览器 CORS 限制</span>
        </div>
        <div v-if="status" class="status" :class="status.kind">{{ status.text }}</div>
      </div>

      <footer>
        <div class="spacer"></div>
        <button class="btn" @click="close">取消</button>
        <button class="btn primary" @click="save">保存</button>
      </footer>
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
  width: 520px;
  max-width: calc(100vw - 40px);
  max-height: calc(100vh - 80px);
  overflow-y: auto;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: var(--shadow);
  display: flex;
  flex-direction: column;
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
  padding: 16px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.field label {
  font-size: 12px;
  color: var(--text-2);
  margin-bottom: 4px;
  display: block;
}

.field .input,
.field .select {
  width: 100%;
}

.keyrow {
  display: flex;
  gap: 10px;
  align-items: center;
}

.btnrow {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.status {
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 12px;
  word-break: break-all;
}

.status.ok {
  background: var(--accent-soft);
  color: var(--accent);
}

.status.err {
  background: var(--danger-soft);
  color: var(--danger);
}

.status.info {
  background: var(--panel-2);
  color: var(--text-2);
}

.modal footer {
  display: flex;
  gap: 8px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}
</style>
