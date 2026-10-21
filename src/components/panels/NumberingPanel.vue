<script setup lang="ts">
import { useRulesStore } from '../../stores/rules'
import type { NumPosition } from '../../types'

const rules = useRulesStore()

const POSITIONS: { value: NumPosition; label: string }[] = [
  { value: 'prefix', label: '开头' },
  { value: 'suffix', label: '结尾' },
  { value: 'atIndex', label: '第 X 位前' },
  { value: 'replace', label: '替换整个名称' }
]
</script>

<template>
  <div>
    <div class="rule-row" style="margin-bottom: 12px">
      <label class="check" title="启用自动编号">
        <input type="checkbox" v-model="rules.numbering.enabled" />
        <strong>启用自动编号</strong>
      </label>
      <span class="hint">编号顺序 = 当前列表排序顺序（见底部排序）</span>
    </div>
    <div class="numcard">
      <div class="field">
        <label>起始值</label>
        <input class="input" type="number" v-model.number="rules.numbering.start" />
      </div>
      <div class="field">
        <label>步长</label>
        <input class="input" type="number" v-model.number="rules.numbering.step" />
      </div>
      <div class="field">
        <label>位数（不足补零）</label>
        <input class="input" type="number" min="1" v-model.number="rules.numbering.digits" />
      </div>
      <div class="field">
        <label>前缀文本</label>
        <input class="input" v-model="rules.numbering.prefix" placeholder="如 IMG_" />
      </div>
      <div class="field">
        <label>后缀文本</label>
        <input class="input" v-model="rules.numbering.suffix" placeholder="如 _final" />
      </div>
      <div class="field">
        <label>编号位置</label>
        <select class="select" v-model="rules.numbering.position">
          <option v-for="p in POSITIONS" :key="p.value" :value="p.value">{{ p.label }}</option>
        </select>
      </div>
      <div v-if="rules.numbering.position === 'atIndex'" class="field">
        <label>第 X 位前</label>
        <input class="input" type="number" min="1" v-model.number="rules.numbering.index" />
      </div>
    </div>
    <div class="panel-foot">
      <span class="hint">
        示例：起始 1 / 步长 1 / 位数 3 / 前缀 IMG_ / 位置结尾 → 名称IMG_001、名称IMG_002 …
      </span>
    </div>
  </div>
</template>
