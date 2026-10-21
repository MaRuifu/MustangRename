<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAiStore } from '../../stores/ai'
import { useFilesStore } from '../../stores/files'
import { useUiStore } from '../../stores/ui'

const ai = useAiStore()
const files = useFilesStore()
const ui = useUiStore()

const prompt = ref('')

const aiCount = computed(() => Object.keys(ai.names).length)

async function send() {
  const text = prompt.value.trim()
  if (!text || ai.loading) return
  const list = files.visible.filter((it) => !files.excluded.has(it.path))
  if (!list.length) {
    files.showToast('列表为空：请先拖入或选择文件')
    return
  }
  prompt.value = ''
  const names = await ai.generate(text, list)
  if (names) {
    ai.setNames(list.map((it) => it.path), names)
    files.showToast(`AI 已生成 ${names.length} 个新名称（预览中，未执行）`)
  } else {
    files.showToast('AI 回复解析失败，见对话记录')
  }
}
</script>

<template>
  <div class="ai-panel">
    <div class="rule-row" style="margin-bottom: 8px">
      <span v-if="ai.configured" class="chip on">{{ ai.config.name || ai.config.model }} · {{ ai.config.protocol }}</span>
      <span v-else class="chip warn">尚未配置 AI</span>
      <button class="btn small" @click="ui.settingsOpen = true">AI 设置</button>
      <div class="spacer"></div>
      <span v-if="aiCount" class="hint">已应用 {{ aiCount }} 个 AI 名称</span>
      <button class="btn small" :disabled="!ai.messages.length" @click="ai.clearMessages()">清空对话</button>
      <button class="btn small" :disabled="!aiCount" @click="ai.clearNames()">清除 AI 结果</button>
    </div>

    <div class="ai-msgs">
      <div v-if="!ai.messages.length" class="hint" style="padding: 8px 2px">
        用一句话描述重命名规则，AI 会为当前列表的每个文件生成新名称（先预览，确认后才执行）。
      </div>
      <div v-for="(m, i) in ai.messages" :key="i" class="ai-msg" :class="m.role">
        <span class="role">{{ m.role === 'user' ? '我' : 'AI' }}</span>
        <span class="content">
          <template v-if="m.applied">已生成 {{ m.applied }} 个新名称并应用到预览。</template>
          <template v-else>{{ m.content }}</template>
        </span>
      </div>
      <div v-if="ai.loading" class="ai-msg assistant"><span class="role">AI</span><span class="content">思考中…</span></div>
    </div>

    <div class="ai-input-row">
      <input
        class="input grow"
        v-model="prompt"
        placeholder="用一句话描述重命名规则，例如：中文转英文 / 按日期排序并加序号 / 设备+拍摄时间 / 视频时长+码率"
        :disabled="ai.loading || !ai.configured"
        @keyup.enter="send"
      />
      <button class="btn primary" :disabled="ai.loading || !ai.configured || !prompt.trim()" @click="send">
        {{ ai.loading ? '生成中…' : '生成' }}
      </button>
    </div>
    <div class="hint" style="margin-top: 6px">
      多轮对话可继续修正，如「第 3 个太长了」「序号改成三位」。AI 名称优先级：手动编辑 &gt; AI &gt; 规则链。
    </div>
  </div>
</template>

<style scoped>
.ai-msgs {
  max-height: 150px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
  padding: 2px;
}

.ai-msg {
  display: flex;
  gap: 8px;
  font-size: 12px;
  line-height: 1.5;
}

.ai-msg .role {
  flex: none;
  width: 26px;
  text-align: center;
  border-radius: 5px;
  font-size: 11px;
  padding: 1px 0;
  background: var(--panel-2);
  color: var(--text-2);
  height: fit-content;
}

.ai-msg.user .role {
  background: var(--accent-soft);
  color: var(--accent);
}

.ai-msg .content {
  color: var(--text-2);
  word-break: break-all;
  white-space: pre-wrap;
}

.ai-input-row {
  display: flex;
  gap: 8px;
}
</style>
