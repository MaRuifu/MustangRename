/**
 * AI 请求适配层：支持 openai-completions / openai-responses / anthropic-messages 三种协议。
 * Tauri 桌面环境走 Rust http_json 代理（绕开 WebView 的 CORS 限制），浏览器环境回退 fetch。
 */
import { invoke } from '@tauri-apps/api/core'
import type { AiConfig, AiFilePayload, AiMessage } from '../types'
import { isTauri } from './fs'

export const AI_SYSTEM_PROMPT = `你是一个专业的文件批量重命名助手。
用户会给出重命名规则描述和一个 JSON 文件信息数组（字段：name 原文件名、size 字节数、mtime 修改时间毫秒、ctime 创建时间毫秒）。
你必须只输出一个 JSON 字符串数组：与输入顺序、数量完全一致的新文件名（默认保留原扩展名，除非规则要求修改）。
禁止输出解释、禁止 markdown 代码围栏。新名称不得包含 \\ / : * ? " < > | 字符，且数组内不得重复。`

interface HttpRequest {
  url: string
  headers: Record<string, string>
  body: string
}

function trimBase(url: string): string {
  return url.replace(/\/+$/, '')
}

/** 按协议构造聊天请求 */
export function buildChatRequest(config: AiConfig, messages: AiMessage[]): HttpRequest {
  const base = trimBase(config.baseUrl)
  const json = 'application/json'
  if (config.protocol === 'anthropic-messages') {
    const system = AI_SYSTEM_PROMPT
    const msgs = messages.map((m) => ({ role: m.role, content: m.content }))
    return {
      url: `${base}/messages`,
      headers: {
        'content-type': json,
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        // 允许浏览器直连时的 CORS 头（桌面端走代理也无害）
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: JSON.stringify({ model: config.model, max_tokens: 8192, system, messages: msgs })
    }
  }
  if (config.protocol === 'openai-responses') {
    return {
      url: `${base}/responses`,
      headers: { 'content-type': json, authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({
        model: config.model,
        instructions: AI_SYSTEM_PROMPT,
        input: messages.map((m) => ({ role: m.role, content: m.content }))
      })
    }
  }
  // openai-completions
  return {
    url: `${base}/chat/completions`,
    headers: { 'content-type': json, authorization: `Bearer ${config.apiKey}` },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      messages: [{ role: 'system', content: AI_SYSTEM_PROMPT }, ...messages.map((m) => ({ role: m.role, content: m.content }))]
    })
  }
}

/** 从聊天响应中提取助手文本 */
export function extractChatText(config: AiConfig, raw: string): string {
  const j = JSON.parse(raw)
  if (config.protocol === 'anthropic-messages') {
    const parts = Array.isArray(j.content) ? j.content : []
    return parts
      .filter((c: { type?: string }) => c.type === 'text')
      .map((c: { text?: string }) => c.text ?? '')
      .join('')
  }
  if (config.protocol === 'openai-responses') {
    if (typeof j.output_text === 'string' && j.output_text) return j.output_text
    const out = Array.isArray(j.output) ? j.output : []
    for (const item of out) {
      if (item.type === 'message' && Array.isArray(item.content)) {
        const text = item.content
          .filter((c: { type?: string }) => c.type === 'output_text')
          .map((c: { text?: string }) => c.text ?? '')
          .join('')
        if (text) return text
      }
    }
    return ''
  }
  return j?.choices?.[0]?.message?.content ?? ''
}

/** 按协议构造模型列表请求 */
export function buildModelsRequest(config: AiConfig): HttpRequest {
  const base = trimBase(config.baseUrl)
  const url = `${base}/models`
  if (config.protocol === 'anthropic-messages') {
    return {
      url,
      headers: {
        'x-api-key': config.apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true'
      },
      body: ''
    }
  }
  return { url, headers: { authorization: `Bearer ${config.apiKey}` }, body: '' }
}

/** 解析模型列表响应，兼容 openai / anthropic 两种形状 */
export function extractModels(raw: string): string[] {
  const j = JSON.parse(raw)
  const list = Array.isArray(j) ? j : Array.isArray(j.data) ? j.data : []
  const out: string[] = []
  for (const m of list) {
    if (typeof m === 'string') out.push(m)
    else if (m && typeof m.id === 'string') out.push(m.id)
  }
  return out.sort()
}

function friendlyError(e: unknown, url: string): Error {
  const msg = String(e)
  if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('fetch failed')) {
    return new Error(
      `无法连接 ${url}：地址不可达，或被浏览器 CORS 拦截（开发期应走 /ai-proxy 代理，请确认 dev 服务器已重启）`
    )
  }
  return e instanceof Error ? e : new Error(msg)
}

async function http(method: 'GET' | 'POST', req: HttpRequest): Promise<string> {
  // 开发期（浏览器预览 或 Tauri dev 窗口）：走 vite dev 服务器代理，绕开 CORS
  if (import.meta.env.DEV) {
    const u = new URL(req.url)
    try {
      const r = await fetch(`/ai-proxy${u.pathname}${u.search}`, {
        method,
        headers: { ...req.headers, 'x-proxy-target': u.origin },
        body: method === 'GET' ? undefined : req.body
      })
      const text = await r.text()
      if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`)
      return text
    } catch (e) {
      throw friendlyError(e, req.url)
    }
  }
  // 生产桌面版：走 Rust 本地代理
  if (isTauri()) {
    try {
      return await invoke<string>('http_json', {
        method,
        url: req.url,
        headers: req.headers,
        body: req.body
      })
    } catch (e) {
      throw friendlyError(e, req.url)
    }
  }
  try {
    const r = await fetch(req.url, {
      method,
      headers: req.headers,
      body: method === 'GET' ? undefined : req.body
    })
    const text = await r.text()
    if (!r.ok) throw new Error(`HTTP ${r.status}: ${text.slice(0, 300)}`)
    return text
  } catch (e) {
    throw friendlyError(e, req.url)
  }
}

export async function chat(config: AiConfig, messages: AiMessage[]): Promise<string> {
  const raw = await http('POST', buildChatRequest(config, messages))
  const text = extractChatText(config, raw)
  if (!text) throw new Error('响应中未解析到文本内容')
  return text
}

export async function listModels(config: AiConfig): Promise<string[]> {
  const raw = await http('GET', buildModelsRequest(config))
  return extractModels(raw)
}

/** 从回复文本中宽松解析新名称数组 */
export function parseNames(text: string): string[] | null {
  const tryParse = (s: string): string[] | null => {
    try {
      const j = JSON.parse(s)
      if (Array.isArray(j) && j.every((x) => typeof x === 'string')) return j as string[]
      if (j && typeof j === 'object' && !Array.isArray(j)) {
        const vals = Object.values(j)
        if (vals.length && vals.every((x) => typeof x === 'string')) return vals as string[]
      }
    } catch {
      /* ignore */
    }
    return null
  }
  const direct = tryParse(text.trim())
  if (direct) return direct
  const l = text.indexOf('[')
  const r = text.lastIndexOf(']')
  if (l >= 0 && r > l) {
    const inner = tryParse(text.slice(l, r + 1))
    if (inner) return inner
  }
  const lb = text.indexOf('{')
  const rb = text.lastIndexOf('}')
  if (lb >= 0 && rb > lb) {
    const inner = tryParse(text.slice(lb, rb + 1))
    if (inner) return inner
  }
  return null
}

/** 构造传给 AI 的文件列表 */
export function buildPayload(items: { name: string; size: number; mtime: number; ctime: number }[]): AiFilePayload[] {
  return items.map((it) => ({ name: it.name, size: it.size, mtime: it.mtime, ctime: it.ctime }))
}
