import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { AiConfig, AiFilePayload, AiMessage } from '../types'
import { buildPayload, chat, listModels, parseNames } from '../composables/ai'

const LS_KEY = 'mustang-rename.ai-config'

function loadConfig(): AiConfig {
  const fallback: AiConfig = {
    name: '',
    protocol: 'openai-completions',
    baseUrl: '',
    apiKey: '',
    model: ''
  }
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return fallback
    return { ...fallback, ...(JSON.parse(raw) as Partial<AiConfig>) }
  } catch {
    return fallback
  }
}

export const useAiStore = defineStore('ai', () => {
  const config = ref<AiConfig>(loadConfig())
  const messages = ref<AiMessage[]>([])
  /** AI 生成的新名称：path -> newName（优先级低于手动编辑、高于规则链） */
  const names = ref<Record<string, string>>({})
  const loading = ref(false)
  const models = ref<string[]>([])

  const configured = computed(() => !!config.value.baseUrl && !!config.value.model)

  function saveConfig(patch: Partial<AiConfig>) {
    config.value = { ...config.value, ...patch }
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(config.value))
    } catch {
      /* ignore */
    }
  }

  function setNames(paths: string[], newNames: string[]) {
    const next: Record<string, string> = {}
    paths.forEach((p, i) => {
      const n = newNames[i]
      if (typeof n === 'string' && n.trim()) next[p] = n.trim()
    })
    names.value = next
  }

  function clearNames() {
    names.value = {}
  }

  function clearMessages() {
    messages.value = []
  }

  /**
   * 一轮对话：把规则描述发给 AI，返回解析出的新名称数组（失败返回 null）。
   * files 为当前参与重命名的文件列表（顺序即编号顺序）。
   */
  async function generate(
    ruleText: string,
    files: { path: string; name: string; size: number; mtime: number; ctime: number }[]
  ): Promise<string[] | null> {
    if (!configured.value) return null
    loading.value = true
    messages.value.push({ role: 'user', content: ruleText })
    try {
      const payload = buildPayload(files)
      const content = `${ruleText}\n\n文件列表（共 ${payload.length} 个，按此顺序返回新名称）:\n${JSON.stringify(payload)}`
      const history: AiMessage[] = [...messages.value.slice(0, -1), { role: 'user', content }]
      const reply = await chat(config.value, history)
      const parsed = parseNames(reply)
      if (!parsed) {
        messages.value.push({ role: 'assistant', content: reply.slice(0, 500) })
        return null
      }
      if (parsed.length !== files.length) {
        messages.value.push({
          role: 'assistant',
          content: `返回数量 ${parsed.length} 与文件数 ${files.length} 不一致，未应用。原始回复：${reply.slice(0, 300)}`
        })
        return null
      }
      messages.value.push({ role: 'assistant', content: reply.slice(0, 300), applied: parsed.length })
      return parsed
    } catch (e) {
      messages.value.push({ role: 'assistant', content: `请求失败：${String(e)}` })
      return null
    } finally {
      loading.value = false
    }
  }

  async function fetchModels(): Promise<string[]> {
    const list = await listModels(config.value)
    models.value = list
    return list
  }

  async function testConnection(): Promise<string> {
    const reply = await chat(config.value, [{ role: 'user', content: '请只回复两个字：正常' }])
    return reply.slice(0, 100)
  }

  return {
    config,
    messages,
    names,
    loading,
    models,
    configured,
    saveConfig,
    setNames,
    clearNames,
    clearMessages,
    generate,
    fetchModels,
    testConnection
  }
})

export type { AiFilePayload }
