/**
 * 文件系统适配层：
 * - Tauri 桌面环境：走 Rust 命令（真实绝对路径，可执行重命名）
 * - 浏览器环境：仅预览（DataTransfer 遍历拖入的文件/文件夹，无绝对路径，禁止执行）
 */
import { invoke } from '@tauri-apps/api/core'
import type { FileItem, RenameOp, RenameResult, ScanOpts } from '../types'

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

export async function scanPaths(paths: string[], opts: ScanOpts): Promise<FileItem[]> {
  return invoke<FileItem[]>('scan_paths', {
    paths,
    recursive: opts.recursive,
    includeHidden: opts.includeHidden
  })
}

export async function renameFiles(ops: RenameOp[]): Promise<RenameResult[]> {
  return invoke<RenameResult[]>('rename_files', { ops })
}

/* ---------- 浏览器预览模式：遍历 DataTransfer ---------- */

interface FsEntry {
  isFile: boolean
  isDirectory: boolean
  name: string
  createReader?: () => {
    readEntries: (cb: (e: FsEntry[]) => void, err: (e: unknown) => void) => void
  }
  file?: (cb: (f: File) => void, err: (e: unknown) => void) => void
}

function getEntry(item: DataTransferItem): FsEntry | null {
  const anyItem = item as unknown as { webkitGetAsEntry?: () => FsEntry | null }
  return anyItem.webkitGetAsEntry ? anyItem.webkitGetAsEntry() : null
}

function readFile(entry: FsEntry): Promise<File | null> {
  return new Promise((resolve) => {
    if (!entry.file) return resolve(null)
    entry.file(
      (f) => resolve(f),
      () => resolve(null)
    )
  })
}

function readDirEntries(entry: FsEntry): Promise<FsEntry[]> {
  return new Promise((resolve) => {
    const reader = entry.createReader?.()
    if (!reader) return resolve([])
    reader.readEntries(
      (list) => resolve(list),
      () => resolve([])
    )
  })
}

async function walkEntry(entry: FsEntry, prefix: string, opts: ScanOpts): Promise<FileItem[]> {
  if (entry.isFile) {
    const f = await readFile(entry)
    if (!f) return []
    return [
      {
        path: prefix + entry.name,
        name: entry.name,
        size: f.size,
        mtime: f.lastModified,
        ctime: f.lastModified
      }
    ]
  }
  if (entry.isDirectory && opts.recursive) {
    const out: FileItem[] = []
    let batch: FsEntry[] = []
    do {
      batch = await readDirEntries(entry)
      for (const child of batch) {
        if (!opts.includeHidden && child.name.startsWith('.')) continue
        out.push(...(await walkEntry(child, `${prefix}${entry.name}/`, opts)))
      }
    } while (batch.length > 0)
    return out
  }
  return []
}

export async function scanDataTransfer(dt: DataTransfer, opts: ScanOpts): Promise<FileItem[]> {
  const entries = Array.from(dt.items)
    .map(getEntry)
    .filter((e): e is FsEntry => !!e)
  const out: FileItem[] = []
  for (const e of entries) {
    if (!opts.includeHidden && e.name.startsWith('.')) continue
    out.push(...(await walkEntry(e, '', opts)))
  }
  return out
}
