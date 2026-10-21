import { defineStore } from 'pinia'
import { computed, reactive, ref } from 'vue'
import type {
  FileItem,
  FilterMode,
  Preview,
  RenameLog,
  RenameOp,
  ScanOpts,
  SortKey
} from '../types'
import { computeName, validateName } from '../rules/engine'
import { isTauri, renameFiles, scanDataTransfer, scanPaths } from '../composables/fs'
import { useRulesStore, defaultFindReplace, defaultNumbering } from './rules'
import { useAiStore } from './ai'

function baseName(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i < 0 ? p : p.slice(i + 1)
}

function dirName(p: string): string {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i < 0 ? '' : p.slice(0, i)
}

function joinPath(dir: string, name: string): string {
  if (!dir) return name
  const sep = dir.includes('\\') && !dir.includes('/') ? '\\' : '/'
  return dir.endsWith(sep) ? dir + name : dir + sep + name
}

const SORT_LABELS: Record<SortKey, string> = {
  nameAsc: '按名称升序',
  nameDesc: '按名称降序',
  sizeAsc: '按大小升序',
  sizeDesc: '按大小降序',
  mtimeAsc: '按修改时间升序',
  mtimeDesc: '按修改时间降序',
  ctimeAsc: '按创建时间升序',
  ctimeDesc: '按创建时间降序',
  custom: '自定义顺序（拖拽）'
}

export { SORT_LABELS }

export const useFilesStore = defineStore('files', () => {
  const rulesStore = useRulesStore()
  const aiStore = useAiStore()

  const items = ref<FileItem[]>([])
  const roots = ref<string[]>([])
  const excluded = ref<Set<string>>(new Set())
  const sortKey = ref<SortKey>('nameAsc')
  const filterMode = ref<FilterMode>('all')
  const filterText = ref('')
  const scanOpts = reactive<ScanOpts>({ recursive: true, includeHidden: false })
  const logs = ref<RenameLog[]>([])
  const scanning = ref(false)
  const busy = ref(false)
  const toast = ref<string | null>(null)
  let toastTimer: ReturnType<typeof setTimeout> | null = null

  function showToast(msg: string) {
    toast.value = msg
    if (toastTimer) clearTimeout(toastTimer)
    toastTimer = setTimeout(() => (toast.value = null), 2600)
  }

  /* ---------------- 扫描 ---------------- */

  async function addPaths(paths: string[]) {
    const fresh = paths.filter((p) => !roots.value.includes(p))
    if (!fresh.length) return
    roots.value.push(...fresh)
    await rescan()
  }

  async function addDataTransfer(dt: DataTransfer) {
    scanning.value = true
    try {
      const list = await scanDataTransfer(dt, scanOpts)
      if (!list.length) {
        showToast('未读取到文件（浏览器模式仅支持预览）')
        return
      }
      items.value = dedupe([...items.value, ...list])
      showToast(`浏览器预览模式：已载入 ${list.length} 个文件`)
    } finally {
      scanning.value = false
    }
  }

  function dedupe(list: FileItem[]): FileItem[] {
    const seen = new Set<string>()
    return list.filter((it) => (seen.has(it.path) ? false : (seen.add(it.path), true)))
  }

  async function rescan() {
    if (!isTauri()) return
    if (!roots.value.length) {
      items.value = []
      return
    }
    scanning.value = true
    try {
      const list = await scanPaths(roots.value, scanOpts)
      items.value = list
      // 清理已不存在路径的排除/手动编辑记录
      const alive = new Set(list.map((it) => it.path))
      for (const p of [...excluded.value]) if (!alive.has(p)) excluded.value.delete(p)
      for (const p of Object.keys(rulesStore.overrides)) if (!alive.has(p)) delete rulesStore.overrides[p]
    } catch (e) {
      showToast(`扫描失败：${String(e)}`)
    } finally {
      scanning.value = false
    }
  }

  function clear() {
    items.value = []
    roots.value = []
    excluded.value.clear()
    rulesStore.clearOverrides()
    aiStore.clearNames()
  }

  /**
   * 演示种子：仅开发模式 + URL 带 ?demo=1 时使用（App.vue 中调用），
   * 灌入模拟文件与规则，方便截图 / 无文件时预览界面效果。不会进入生产包。
   */
  function loadDemo() {
    const t = (s: string) => new Date(s).getTime()
    const mk = (name: string, size: number, m: string, c: string): FileItem => ({
      path: '/demo/' + name,
      name,
      size,
      mtime: t(m),
      ctime: t(c)
    })
    items.value = [
      mk('IMG_20240315_103022.jpg', 2469123, '2024-03-15T10:30:22', '2024-03-15T10:30:22'),
      mk('IMG_20240315_103145.jpg', 2512823, '2024-03-15T10:31:45', '2024-03-15T10:31:45'),
      mk('IMG_20240316_091503.jpg', 1988234, '2024-03-16T09:15:03', '2024-03-16T09:15:03'),
      mk('会议纪要-初稿.docx', 45120, '2024-04-02T14:20:00', '2024-04-01T09:00:00'),
      mk('会议纪要-终稿.docx', 48930, '2024-04-05T17:42:10', '2024-04-02T10:12:00'),
      mk('产品需求说明.pdf', 1258291, '2024-04-08T11:05:00', '2024-04-07T16:30:00'),
      mk('设计稿-v3.png', 4823411, '2024-04-10T09:12:00', '2024-04-09T15:00:00'),
      mk('设计稿-v4.png', 4912300, '2024-04-12T10:44:00', '2024-04-10T09:20:00'),
      mk('合同扫描件_01.pdf', 823411, '2024-04-15T15:00:00', '2024-04-15T14:50:00'),
      mk('合同扫描件_02.pdf', 867120, '2024-04-15T15:02:00', '2024-04-15T14:52:00'),
      mk('录音_客户回访.m4a', 15234876, '2024-04-18T16:30:00', '2024-04-18T16:30:00'),
      mk('视频_发布会.mp4', 238745612, '2024-04-20T19:00:00', '2024-04-20T19:00:00'),
      mk('数据报表-2024Q1.xlsx', 234120, '2024-04-22T08:30:00', '2024-04-01T08:00:00'),
      mk('数据报表-2024Q2.xlsx', 251003, '2024-07-22T08:30:00', '2024-07-01T08:00:00'),
      mk('README.md', 4820, '2024-07-25T12:00:00', '2024-01-05T10:00:00'),
      mk('package.json', 1203, '2024-07-25T12:01:00', '2024-01-05T10:01:00'),
      mk('照片 001.jpg', 3120458, '2024-08-01T18:22:00', '2024-08-01T18:22:00'),
      mk('照片 002.jpg', 3201444, '2024-08-01T18:23:00', '2024-08-01T18:23:00')
    ]
    roots.value = ['demo://']
    // 演示规则：IMG_ → 照片_，结尾追加 -01 序号
    rulesStore.findReplace = [{ ...defaultFindReplace(), find: 'IMG_', replace: '照片_' }]
    rulesStore.numbering = { ...defaultNumbering(), enabled: true, position: 'suffix', prefix: '-' }
    // 演示重名冲突（两个文件手动改成同名）
    rulesStore.setOverride('/demo/录音_客户回访.m4a', '发布会实录.mp4')
    rulesStore.setOverride('/demo/视频_发布会.mp4', '发布会实录.mp4')
    // 演示排除
    excluded.value.add('/demo/package.json')
  }

  /* ---------------- 排序 / 筛选 / 拖拽排序 ---------------- */

  const orderMap = computed(() => {
    const m = new Map<string, number>()
    items.value.forEach((it, i) => m.set(it.path, i))
    return m
  })

  function cmp(a: FileItem, b: FileItem): number {
    let r = 0
    switch (sortKey.value) {
      case 'custom':
        r = (orderMap.value.get(a.path) ?? 0) - (orderMap.value.get(b.path) ?? 0)
        return r
      case 'nameAsc':
      case 'nameDesc':
        r = a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true })
        break
      case 'sizeAsc':
      case 'sizeDesc':
        r = a.size - b.size
        break
      case 'mtimeAsc':
      case 'mtimeDesc':
        r = a.mtime - b.mtime
        break
      case 'ctimeAsc':
      case 'ctimeDesc':
        r = a.ctime - b.ctime
        break
    }
    if (r === 0) r = a.name.localeCompare(b.name, 'zh-Hans-CN', { numeric: true })
    return sortKey.value.endsWith('Desc') ? -r : r
  }

  /** 拖拽排序：把 visible 中 fromIdx 的行移动到 toIdx（切换为自定义顺序） */
  function moveItem(fromIdx: number, toIdx: number) {
    const vis = visible.value
    if (fromIdx < 0 || toIdx < 0 || fromIdx >= vis.length || toIdx >= vis.length) return
    if (fromIdx === toIdx) return
    const fromPath = vis[fromIdx].path
    const toPath = vis[toIdx].path
    const arr = items.value
    const fi = arr.findIndex((x) => x.path === fromPath)
    const ti = arr.findIndex((x) => x.path === toPath)
    if (fi < 0 || ti < 0) return
    const [moved] = arr.splice(fi, 1)
    arr.splice(ti, 0, moved)
    sortKey.value = 'custom'
  }

  function matchFilter(it: FileItem): boolean {
    const t = filterText.value.trim()
    if (filterMode.value === 'all' || !t) return true
    if (filterMode.value === 'keyword') return it.name.toLowerCase().includes(t.toLowerCase())
    if (filterMode.value === 'ext') {
      const exts = t
        .split(/[,，\s]+/)
        .filter(Boolean)
        .map((s) => s.replace(/^\./, '').toLowerCase())
      const i = it.name.lastIndexOf('.')
      const ext = i > 0 ? it.name.slice(i + 1).toLowerCase() : ''
      return exts.includes(ext)
    }
    try {
      return new RegExp(t, 'i').test(it.name)
    } catch {
      return false
    }
  }

  const visible = computed<FileItem[]>(() =>
    [...items.value].sort(cmp).filter(matchFilter)
  )

  /* ---------------- 预览 / 冲突 ---------------- */

  const preview = computed<Map<string, Preview>>(() => {
    const map = new Map<string, Preview>()
    const ruleList = rulesStore.orderedRules()
    const includeExt = rulesStore.includeExt

    // 序号：按当前排序+筛选后、未排除的顺序
    let idx = 0
    const indexMap = new Map<string, number>()
    for (const it of visible.value) {
      if (!excluded.value.has(it.path)) indexMap.set(it.path, idx++)
    }

    for (const it of visible.value) {
      if (excluded.value.has(it.path)) {
        map.set(it.path, { newName: it.name, status: 'excluded' })
        continue
      }
      const ov = rulesStore.overrides[it.path]
      const aiName = aiStore.names[it.path]
      let newName: string
      let source: Preview['source'] = 'rule'
      if (ov !== undefined && ov !== '') {
        newName = ov
        source = 'manual'
      } else if (aiName !== undefined) {
        newName = aiName
        source = 'ai'
      } else {
        newName = computeName(it.name, ruleList, includeExt, { index: indexMap.get(it.path) ?? 0, file: it })
      }
      const err = validateName(newName)
      map.set(it.path, { newName, status: err ? 'invalid' : 'changed', source, error: err ?? undefined })
    }

    // 重名检测（不含被排除项）
    const counts = new Map<string, number>()
    for (const it of visible.value) {
      const p = map.get(it.path)
      if (!p || p.status === 'excluded') continue
      const k = p.newName.toLowerCase()
      counts.set(k, (counts.get(k) ?? 0) + 1)
    }
    for (const it of visible.value) {
      const p = map.get(it.path)
      if (!p || p.status === 'excluded' || p.status === 'invalid') continue
      if ((counts.get(p.newName.toLowerCase()) ?? 0) > 1) p.status = 'conflict'
      else if (p.newName === it.name) p.status = 'same'
    }
    return map
  })

  const stats = computed(() => {
    let selected = 0
    let conflicts = 0
    let invalids = 0
    let changed = 0
    for (const it of visible.value) {
      const p = preview.value.get(it.path)
      if (!p) continue
      if (p.status === 'excluded') continue
      selected++
      if (p.status === 'conflict') conflicts++
      else if (p.status === 'invalid') invalids++
      else if (p.status === 'changed') changed++
    }
    return { total: visible.value.length, selected, conflicts, invalids, changed }
  })

  /* ---------------- 排除 ---------------- */

  function toggleExcluded(path: string) {
    if (excluded.value.has(path)) excluded.value.delete(path)
    else excluded.value.add(path)
  }

  /* ---------------- 执行 / 撤销 ---------------- */

  function applyRenames(results: { old_path: string; new_name: string }[]) {
    for (const r of results) {
      const it = items.value.find((x) => x.path === r.old_path)
      if (!it) continue
      const np = joinPath(dirName(r.old_path), r.new_name)
      it.path = np
      it.name = r.new_name
      if (excluded.value.has(r.old_path)) {
        excluded.value.delete(r.old_path)
        excluded.value.add(np)
      }
      if (rulesStore.overrides[r.old_path] !== undefined) delete rulesStore.overrides[r.old_path]
      if (aiStore.names[r.old_path] !== undefined) delete aiStore.names[r.old_path]
    }
  }

  async function execute() {
    if (!isTauri()) {
      showToast('浏览器预览模式不支持执行，请运行桌面版')
      return
    }
    if (stats.value.conflicts || stats.value.invalids) {
      showToast('存在重名冲突或非法名称，请先处理')
      return
    }
    const ops: RenameOp[] = []
    for (const it of visible.value) {
      if (excluded.value.has(it.path)) continue
      const p = preview.value.get(it.path)
      if (!p || p.status !== 'changed') continue
      ops.push({ oldPath: it.path, newName: p.newName })
    }
    if (!ops.length) {
      showToast('没有需要重命名的文件')
      return
    }
    busy.value = true
    try {
      const results = await renameFiles(ops)
      const ok = results.filter((r) => r.ok)
      const failed = results.length - ok.length
      if (ok.length) {
        logs.value.push({ time: Date.now(), ops: ok.map((r) => ({ oldPath: r.old_path, newName: r.new_name })) })
        applyRenames(ok)
      }
      showToast(
        failed
          ? `已重命名 ${ok.length} 个，失败 ${failed} 个`
          : `已重命名 ${ok.length} 个文件，可点击「撤销」回滚`
      )
    } catch (e) {
      showToast(`执行失败：${String(e)}`)
    } finally {
      busy.value = false
    }
  }

  async function undo() {
    if (!isTauri()) {
      showToast('浏览器预览模式不支持撤销')
      return
    }
    const log = logs.value.pop()
    if (!log) return
    busy.value = true
    try {
      const ops: RenameOp[] = [...log.ops]
        .reverse()
        .map((o) => ({ oldPath: joinPath(dirName(o.oldPath), o.newName), newName: baseName(o.oldPath) }))
      const results = await renameFiles(ops)
      const ok = results.filter((r) => r.ok)
      applyRenames(ok)
      const failed = results.length - ok.length
      if (failed) {
        // 失败的部分保留回日志，便于再次撤销
        logs.value.push({
          time: Date.now(),
          ops: results.filter((r) => !r.ok).map((r) => ({ oldPath: r.old_path, newName: r.new_name }))
        })
      }
      showToast(failed ? `已撤销 ${ok.length} 个，${failed} 个失败` : `已撤销 ${ok.length} 个文件`)
    } catch (e) {
      logs.value.push(log)
      showToast(`撤销失败：${String(e)}`)
    } finally {
      busy.value = false
    }
  }

  return {
    items,
    roots,
    excluded,
    sortKey,
    filterMode,
    filterText,
    scanOpts,
    logs,
    scanning,
    busy,
    toast,
    visible,
    preview,
    stats,
    showToast,
    addPaths,
    addDataTransfer,
    rescan,
    clear,
    loadDemo,
    moveItem,
    toggleExcluded,
    execute,
    undo
  }
})
