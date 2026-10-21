import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { FindReplaceRule, InsertRule, NumberingRule, Rule } from '../types'
import { uid } from '../rules/engine'

export function defaultFindReplace(): FindReplaceRule {
  return {
    kind: 'findReplace',
    id: uid(),
    enabled: true,
    scope: 'all',
    n: 1,
    x: 1,
    char: '',
    find: '',
    replace: '',
    useRegex: false,
    caseSensitive: true
  }
}

export function defaultInsert(): InsertRule {
  return {
    kind: 'insert',
    id: uid(),
    enabled: true,
    position: 'prefix',
    index: 1,
    char: '',
    contentType: 'text',
    text: '',
    seqFormat: 'arabic',
    seqStart: 1,
    seqDigits: 2,
    fileInfoKind: 'mtime',
    timeFormat: 'YYYYMMDD',
    sizeFormat: 'auto'
  }
}

export function defaultNumbering(): NumberingRule {
  return {
    kind: 'numbering',
    id: uid(),
    enabled: false,
    start: 1,
    step: 1,
    digits: 2,
    prefix: '',
    suffix: '',
    position: 'suffix',
    index: 1
  }
}

export const useRulesStore = defineStore('rules', () => {
  /** 规则是否作用于扩展名（= 「替换文件扩展名」） */
  const includeExt = ref(false)

  const findReplace = ref<FindReplaceRule[]>([defaultFindReplace()])
  const insert = ref<InsertRule[]>([])
  const numbering = ref<NumberingRule>(defaultNumbering())

  /** 手动编辑：path -> 用户指定的完整新文件名（最终覆盖一切） */
  const overrides = ref<Record<string, string>>({})

  /** 规则链顺序：查找替换 → 插入 → 编号 */
  function orderedRules(): Rule[] {
    return [
      ...findReplace.value,
      ...insert.value,
      ...(numbering.value.enabled ? [numbering.value] : [])
    ]
  }

  function addFindReplace() {
    findReplace.value.push(defaultFindReplace())
  }
  function removeFindReplace(id: string) {
    findReplace.value = findReplace.value.filter((r) => r.id !== id)
  }
  function addInsert() {
    insert.value.push(defaultInsert())
  }
  function removeInsert(id: string) {
    insert.value = insert.value.filter((r) => r.id !== id)
  }
  function setOverride(path: string, value: string) {
    if (value === '') delete overrides.value[path]
    else overrides.value[path] = value
  }
  /** 批量设置手动编辑（多行粘贴用） */
  function setOverrides(entries: [string, string][]) {
    for (const [p, v] of entries) setOverride(p, v)
  }
  function clearOverrides() {
    overrides.value = {}
  }

  return {
    includeExt,
    findReplace,
    insert,
    numbering,
    overrides,
    orderedRules,
    addFindReplace,
    removeFindReplace,
    addInsert,
    removeInsert,
    setOverride,
    setOverrides,
    clearOverrides
  }
})
