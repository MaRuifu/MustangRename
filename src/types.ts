/** 全局类型定义 */

export interface FileItem {
  /** 绝对路径（浏览器预览模式下为相对路径） */
  path: string
  /** 文件名（含扩展名） */
  name: string
  size: number
  /** 修改时间，毫秒时间戳 */
  mtime: number
  /** 创建时间，毫秒时间戳 */
  ctime: number
}

export type SortKey =
  | 'nameAsc'
  | 'nameDesc'
  | 'sizeAsc'
  | 'sizeDesc'
  | 'mtimeAsc'
  | 'mtimeDesc'
  | 'ctimeAsc'
  | 'ctimeDesc'
  | 'custom'

export type FilterMode = 'all' | 'keyword' | 'ext' | 'regex'

export interface ScanOpts {
  recursive: boolean
  includeHidden: boolean
}

/* ---------------- 规则模型 ---------------- */

export interface Ctx {
  /** 序号/编号用：在当前（排序+筛选+未排除）列表中的序号，从 0 开始 */
  index: number
  /** 当前文件信息（插入文件信息用） */
  file: FileItem
}

export type ScopeKind =
  | 'all'
  | 'firstN'
  | 'lastN'
  | 'fromXN'
  | 'afterChar'
  | 'beforeChar'
  | 'afterCharN'
  | 'beforeCharN'

export interface FindReplaceRule {
  kind: 'findReplace'
  id: string
  enabled: boolean
  scope: ScopeKind
  n: number
  x: number
  char: string
  find: string
  replace: string
  useRegex: boolean
  caseSensitive: boolean
}

/* ---- 插入内容 ---- */

export type InsertPosition = 'prefix' | 'suffix' | 'atIndex' | 'afterChar' | 'beforeChar'
export type InsertContentType = 'text' | 'sequence' | 'fileInfo'
export type SeqFormat = 'arabic' | 'zhLower' | 'zhUpper' | 'enUpper' | 'enLower'
export type FileInfoKind = 'ctime' | 'mtime' | 'size'
export type TimeFormat = 'YYYYMMDD' | 'YYYY-MM-DD' | 'YYYYMMDD_HHMMSS' | 'YYYY-MM-DD_HH-MM-SS'
export type SizeFormat = 'auto' | 'bytes'

export interface InsertRule {
  kind: 'insert'
  id: string
  enabled: boolean
  position: InsertPosition
  index: number
  char: string
  contentType: InsertContentType
  text: string
  seqFormat: SeqFormat
  seqStart: number
  seqDigits: number
  fileInfoKind: FileInfoKind
  timeFormat: TimeFormat
  sizeFormat: SizeFormat
}

/* ---- 自动编号 ---- */

export type NumPosition = 'prefix' | 'suffix' | 'atIndex' | 'replace'

export interface NumberingRule {
  kind: 'numbering'
  id: string
  enabled: boolean
  start: number
  step: number
  digits: number
  prefix: string
  suffix: string
  position: NumPosition
  index: number
}

export type Rule = FindReplaceRule | InsertRule | NumberingRule

/* ---------------- AI 智能重命名 ---------------- */

export type AiProtocol = 'openai-completions' | 'openai-responses' | 'anthropic-messages'

export interface AiConfig {
  name: string
  protocol: AiProtocol
  baseUrl: string
  apiKey: string
  model: string
}

export interface AiMessage {
  role: 'user' | 'assistant'
  content: string
  /** 该轮回复成功应用的新名称数量 */
  applied?: number
}

/** 传给 AI 的文件信息 */
export interface AiFilePayload {
  name: string
  size: number
  mtime: number
  ctime: number
}

/* ---------------- 预览与执行 ---------------- */

export type PreviewStatus = 'same' | 'changed' | 'conflict' | 'invalid' | 'excluded'

export interface Preview {
  newName: string
  status: PreviewStatus
  /** 新名称来源：manual 手动编辑 / ai 智能重命名 / rule 规则链 */
  source?: 'manual' | 'ai' | 'rule'
  error?: string
}

export interface RenameOp {
  oldPath: string
  newName: string
}

export interface RenameResult {
  old_path: string
  new_name: string
  ok: boolean
  error: string | null
}

export interface RenameLog {
  time: number
  ops: RenameOp[]
}
