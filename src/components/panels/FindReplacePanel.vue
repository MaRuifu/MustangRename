<script setup lang="ts">
import { useRulesStore } from '../../stores/rules'
import type { FindReplaceRule, ScopeKind } from '../../types'

const rules = useRulesStore()

const SCOPES: { value: ScopeKind; label: string }[] = [
  { value: 'all', label: '整个名称' },
  { value: 'firstN', label: '前 N 位' },
  { value: 'lastN', label: '后 N 位' },
  { value: 'fromXN', label: '从第 X 位开始的 N 位' },
  { value: 'afterChar', label: '某字符之后的内容' },
  { value: 'beforeChar', label: '某字符之前的内容' },
  { value: 'afterCharN', label: '某字符之后的 N 位' },
  { value: 'beforeCharN', label: '某字符之前的 N 位' }
]

function needsN(scope: ScopeKind): boolean {
  return scope === 'firstN' || scope === 'lastN' || scope === 'fromXN' || scope === 'afterCharN' || scope === 'beforeCharN'
}
function needsX(scope: ScopeKind): boolean {
  return scope === 'fromXN'
}
function needsChar(scope: ScopeKind): boolean {
  return scope === 'afterChar' || scope === 'beforeChar' || scope === 'afterCharN' || scope === 'beforeCharN'
}
</script>

<template>
  <div>
    <div v-for="r in rules.findReplace" :key="r.id" class="rule-row">
      <label class="check" title="启用/停用该规则">
        <input type="checkbox" v-model="r.enabled" />
      </label>
      <select class="select" v-model="r.scope" style="width: 172px">
        <option v-for="s in SCOPES" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <input v-if="needsN(r.scope)" class="input num" type="number" min="1" v-model.number="r.n" title="N" />
      <input v-if="needsX(r.scope)" class="input num" type="number" min="1" v-model.number="r.x" title="第 X 位" />
      <input v-if="needsChar(r.scope)" class="input char" v-model="r.char" placeholder="字符" />
      <input class="input grow" v-model="r.find" placeholder="查找（留空 = 替换整个区域）" />
      <span class="arrow">→</span>
      <input class="input grow" v-model="r.replace" placeholder="替换成" />
      <label class="chip" :class="{ on: r.useRegex }" title="使用正则表达式匹配">
        <input type="checkbox" v-model="r.useRegex" hidden />
        正则
      </label>
      <label class="chip" :class="{ on: r.caseSensitive }" title="区分大小写">
        <input type="checkbox" v-model="r.caseSensitive" hidden />
        Aa
      </label>
      <button class="iconbtn" title="删除该规则" @click="rules.removeFindReplace(r.id)">✕</button>
    </div>
    <div v-if="!rules.findReplace.length" class="hint">暂无替换规则，点击下方按钮添加。</div>
    <div class="panel-foot">
      <label class="check" title="关闭时规则只作用于主名，扩展名保持不变">
        <input type="checkbox" v-model="rules.includeExt" />
        替换文件扩展名（规则作用于扩展名）
      </label>
      <button class="btn small" @click="rules.addFindReplace()">＋ 添加替换规则</button>
    </div>
  </div>
</template>
