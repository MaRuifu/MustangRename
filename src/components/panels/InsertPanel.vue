<script setup lang="ts">
import { useRulesStore } from '../../stores/rules'
import type { InsertContentType, InsertPosition, FileInfoKind, SeqFormat, SizeFormat, TimeFormat } from '../../types'

const rules = useRulesStore()

const POSITIONS: { value: InsertPosition; label: string }[] = [
  { value: 'prefix', label: '开头' },
  { value: 'suffix', label: '结尾' },
  { value: 'atIndex', label: '第 X 位前' },
  { value: 'afterChar', label: '某字符之后' },
  { value: 'beforeChar', label: '某字符之前' }
]

const CONTENT_TYPES: { value: InsertContentType; label: string }[] = [
  { value: 'text', label: '固定文本' },
  { value: 'sequence', label: '序号' },
  { value: 'fileInfo', label: '文件信息' }
]

const SEQ_FORMATS: { value: SeqFormat; label: string; example: string }[] = [
  { value: 'arabic', label: '阿拉伯数字 1 2 3', example: '01, 02, 03…' },
  { value: 'zhLower', label: '中文小写 一 二 三', example: '一, 二, 十一…' },
  { value: 'zhUpper', label: '中文大写 壹 贰 叁', example: '壹, 贰, 拾壹…' },
  { value: 'enUpper', label: '英文大写 A B C', example: 'A, B, AA…' },
  { value: 'enLower', label: '英文小写 a b c', example: 'a, b, aa…' }
]

const FILE_INFO_KINDS: { value: FileInfoKind; label: string }[] = [
  { value: 'ctime', label: '创建时间' },
  { value: 'mtime', label: '修改时间' },
  { value: 'size', label: '文件大小' }
]

const TIME_FORMATS: TimeFormat[] = ['YYYYMMDD', 'YYYY-MM-DD', 'YYYYMMDD_HHMMSS', 'YYYY-MM-DD_HH-MM-SS']
const SIZE_FORMATS: { value: SizeFormat; label: string }[] = [
  { value: 'auto', label: '自动单位（1.2MB）' },
  { value: 'bytes', label: '字节数（1258291）' }
]
</script>

<template>
  <div>
    <div v-for="r in rules.insert" :key="r.id" class="rule-row wrap">
      <label class="check" title="启用/停用该规则">
        <input type="checkbox" v-model="r.enabled" />
      </label>
      <select class="select" v-model="r.contentType" style="width: 110px" title="插入内容类型">
        <option v-for="c in CONTENT_TYPES" :key="c.value" :value="c.value">{{ c.label }}</option>
      </select>

      <!-- 固定文本 -->
      <input v-if="r.contentType === 'text'" class="input grow" v-model="r.text" placeholder="要插入的文本" />

      <!-- 序号 -->
      <template v-else-if="r.contentType === 'sequence'">
        <select class="select" v-model="r.seqFormat" style="width: 168px">
          <option v-for="s in SEQ_FORMATS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
        <label class="field inline">
          <span>从第</span>
          <input class="input num" type="number" v-model.number="r.seqStart" />
          <span>个开始</span>
        </label>
        <label v-if="r.seqFormat === 'arabic'" class="field inline">
          <span>补零</span>
          <input class="input num" type="number" min="1" v-model.number="r.seqDigits" />
          <span>位</span>
        </label>
        <span class="hint">{{ SEQ_FORMATS.find((s) => s.value === r.seqFormat)?.example }}</span>
      </template>

      <!-- 文件信息 -->
      <template v-else>
        <select class="select" v-model="r.fileInfoKind" style="width: 110px">
          <option v-for="k in FILE_INFO_KINDS" :key="k.value" :value="k.value">{{ k.label }}</option>
        </select>
        <select v-if="r.fileInfoKind !== 'size'" class="select" v-model="r.timeFormat" style="width: 190px">
          <option v-for="t in TIME_FORMATS" :key="t" :value="t">{{ t }}</option>
        </select>
        <select v-else class="select" v-model="r.sizeFormat" style="width: 160px">
          <option v-for="s in SIZE_FORMATS" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </template>

      <span class="arrow">插入到</span>
      <select class="select" v-model="r.position" style="width: 110px">
        <option v-for="p in POSITIONS" :key="p.value" :value="p.value">{{ p.label }}</option>
      </select>
      <input v-if="r.position === 'atIndex'" class="input num" type="number" min="1" v-model.number="r.index" title="第 X 位" />
      <input v-if="r.position === 'afterChar' || r.position === 'beforeChar'" class="input char" v-model="r.char" placeholder="字符" />
      <button class="iconbtn" title="删除该规则" @click="rules.removeInsert(r.id)">✕</button>
    </div>
    <div v-if="!rules.insert.length" class="hint">暂无插入规则。</div>
    <div class="panel-foot">
      <span class="hint">序号顺序 = 当前列表排序顺序；文件信息取自系统元数据。</span>
      <button class="btn small" @click="rules.addInsert()">＋ 添加插入规则</button>
    </div>
  </div>
</template>
