/**
 * 重命名规则引擎：纯函数，方便单测与复用。
 * 规则按 查找替换 → 插入内容 → 自动编号 的顺序串联执行；
 * AI 智能重命名与手动编辑作为独立层，在 store 中按 ai → 手动 的优先级覆盖规则结果。
 */
import type {
  Ctx,
  FindReplaceRule,
  InsertRule,
  NumberingRule,
  Rule,
  SeqFormat,
  SizeFormat,
  TimeFormat
} from '../types'

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}

/** 拆分主名与扩展名；.gitignore 这类点文件视为无扩展名 */
export function splitExt(name: string): [string, string] {
  const i = name.lastIndexOf('.')
  if (i <= 0) return [name, '']
  return [name.slice(0, i), name.slice(i + 1)]
}

/* ---------------- 查找替换 ---------------- */

function regionBounds(name: string, r: FindReplaceRule): [number, number] | null {
  const len = name.length
  switch (r.scope) {
    case 'all':
      return [0, len]
    case 'firstN':
      return [0, clamp(r.n, 0, len)]
    case 'lastN':
      return [Math.max(0, len - r.n), len]
    case 'fromXN': {
      const a = r.x - 1
      if (a < 0 || a >= len) return null
      return [a, Math.min(len, a + r.n)]
    }
    case 'afterChar':
    case 'afterCharN': {
      if (!r.char) return null
      const i = name.indexOf(r.char)
      if (i < 0) return null
      const a = i + r.char.length
      return r.scope === 'afterChar' ? [a, len] : [a, Math.min(len, a + r.n)]
    }
    case 'beforeChar':
    case 'beforeCharN': {
      if (!r.char) return null
      const i = name.indexOf(r.char)
      if (i < 0) return null
      return r.scope === 'beforeChar' ? [0, i] : [Math.max(0, i - r.n), i]
    }
    default:
      return null
  }
}

function applyFindReplace(name: string, r: FindReplaceRule): string {
  const bounds = regionBounds(name, r)
  if (!bounds) return name
  const [a, z] = bounds
  const region = name.slice(a, z)
  let out: string
  if (r.find === '') {
    out = r.replace
  } else {
    const flags = r.caseSensitive ? 'g' : 'gi'
    try {
      const re = new RegExp(r.useRegex ? r.find : escapeRegExp(r.find), flags)
      out = region.replace(re, r.replace)
    } catch {
      return name
    }
  }
  return name.slice(0, a) + out + name.slice(z)
}

/* ---------------- 序号 / 时间 / 大小 文本生成 ---------------- */

const ZH_LOWER = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
const ZH_UPPER = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖']

/** 中文数字：11 → 十一 / 壹拾壹，105 → 一百零五，2024 → 二千零二十四 */
export function zhNumber(n: number, upper: boolean): string {
  const d = upper ? ZH_UPPER : ZH_LOWER
  if (!Number.isFinite(n) || n <= 0) return d[0]
  const units = ['', upper ? '拾' : '十', upper ? '佰' : '百', upper ? '仟' : '千']
  const s = String(Math.floor(n))
  let out = ''
  let zero = false
  for (let i = 0; i < s.length; i++) {
    const digit = Number(s[i])
    const pos = s.length - 1 - i
    if (digit === 0) {
      zero = true
      continue
    }
    if (zero && out) out += d[0]
    zero = false
    out += d[digit] + (units[pos] ?? '')
  }
  if (!out) return d[0]
  // 一十一 → 十一（仅小写）
  if (!upper && out.startsWith('一十')) out = out.slice(1)
  return out
}

/** 列名式英文序号：1 → a，27 → aa */
export function columnLetters(n: number): string {
  let s = ''
  let v = Math.floor(n)
  while (v > 0) {
    const r = (v - 1) % 26
    s = String.fromCharCode(97 + r) + s
    v = Math.floor((v - 1) / 26)
  }
  return s || 'a'
}

export function seqText(format: SeqFormat, n: number, digits: number): string {
  switch (format) {
    case 'arabic':
      return String(n).padStart(Math.max(1, digits), '0')
    case 'zhLower':
      return zhNumber(n, false)
    case 'zhUpper':
      return zhNumber(n, true)
    case 'enUpper':
      return columnLetters(n).toUpperCase()
    case 'enLower':
      return columnLetters(n)
    default:
      return String(n)
  }
}

const pad2 = (x: number) => String(x).padStart(2, '0')

export function formatTime(t: number, f: TimeFormat): string {
  if (!t) return ''
  const d = new Date(t)
  const Y = d.getFullYear()
  const M = pad2(d.getMonth() + 1)
  const D = pad2(d.getDate())
  const h = pad2(d.getHours())
  const m = pad2(d.getMinutes())
  const s = pad2(d.getSeconds())
  switch (f) {
    case 'YYYYMMDD':
      return `${Y}${M}${D}`
    case 'YYYY-MM-DD':
      return `${Y}-${M}-${D}`
    case 'YYYYMMDD_HHMMSS':
      return `${Y}${M}${D}_${h}${m}${s}`
    case 'YYYY-MM-DD_HH-MM-SS':
      return `${Y}-${M}-${D}_${h}-${m}-${s}`
    default:
      return `${Y}${M}${D}`
  }
}

export function formatSize(n: number, f: SizeFormat): string {
  if (f === 'bytes') return String(n)
  if (n < 1024) return `${n}B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)}KB`
  if (n < 1024 * 1024 * 1024) return `${(n / 1024 / 1024).toFixed(1)}MB`
  return `${(n / 1024 / 1024 / 1024).toFixed(2)}GB`
}

/* ---------------- 插入内容 ---------------- */

function insertContent(r: InsertRule, ctx: Ctx): string {
  switch (r.contentType) {
    case 'text':
      return r.text
    case 'sequence':
      return seqText(r.seqFormat, r.seqStart + ctx.index, r.seqDigits)
    case 'fileInfo':
      if (r.fileInfoKind === 'size') return formatSize(ctx.file.size, r.sizeFormat)
      const t = r.fileInfoKind === 'ctime' ? ctx.file.ctime : ctx.file.mtime
      return formatTime(t, r.timeFormat)
    default:
      return ''
  }
}

function applyInsert(name: string, r: InsertRule, ctx: Ctx): string {
  const text = insertContent(r, ctx)
  if (!text) return name
  let i = -1
  switch (r.position) {
    case 'prefix':
      return text + name
    case 'suffix':
      return name + text
    case 'atIndex':
      i = clamp(r.index - 1, 0, name.length)
      return name.slice(0, i) + text + name.slice(i)
    case 'afterChar':
      if (!r.char) return name
      i = name.indexOf(r.char)
      if (i < 0) return name
      i += r.char.length
      return name.slice(0, i) + text + name.slice(i)
    case 'beforeChar':
      if (!r.char) return name
      i = name.indexOf(r.char)
      if (i < 0) return name
      return name.slice(0, i) + text + name.slice(i)
    default:
      return name
  }
}

/* ---------------- 自动编号 ---------------- */

function applyNumbering(name: string, r: NumberingRule, ctx: Ctx): string {
  const num = String(r.start + r.step * ctx.index).padStart(Math.max(1, r.digits), '0')
  const text = r.prefix + num + r.suffix
  switch (r.position) {
    case 'prefix':
      return text + name
    case 'suffix':
      return name + text
    case 'atIndex': {
      const i = clamp(r.index - 1, 0, name.length)
      return name.slice(0, i) + text + name.slice(i)
    }
    case 'replace':
      return text
    default:
      return name
  }
}

/* ---------------- 串联 ---------------- */

export function applyRule(name: string, rule: Rule, ctx: Ctx): string {
  if (!rule.enabled) return name
  switch (rule.kind) {
    case 'findReplace':
      return applyFindReplace(name, rule)
    case 'insert':
      return applyInsert(name, rule, ctx)
    case 'numbering':
      return applyNumbering(name, rule, ctx)
    default:
      return name
  }
}

export function applyPipeline(name: string, rules: Rule[], ctx: Ctx): string {
  let out = name
  for (const r of rules) out = applyRule(out, r, ctx)
  return out
}

/**
 * 计算单个文件的新名称。
 * includeExt=false 时规则只作用于主名，扩展名原样保留。
 */
export function computeName(fullName: string, rules: Rule[], includeExt: boolean, ctx: Ctx): string {
  if (includeExt) return applyPipeline(fullName, rules, ctx)
  const [base, ext] = splitExt(fullName)
  const nb = applyPipeline(base, rules, ctx)
  return ext ? `${nb}.${ext}` : nb
}

/** 校验新文件名，返回错误信息或 null */
export function validateName(name: string): string | null {
  if (!name.trim()) return '名称为空'
  if (name === '.' || name === '..') return '非法名称'
  if (/[\\/:*?"<>|]/.test(name)) return '含非法字符 \\ / : * ? " < > |'
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f]/.test(name)) return '含控制字符'
  if (name.length > 255) return '名称超过 255 字符'
  return null
}
