import { defineStore } from 'pinia'
import { ref } from 'vue'

/** 全局 UI 状态：弹窗开关等 */
export const useUiStore = defineStore('ui', () => {
  const settingsOpen = ref(false)
  const aboutOpen = ref(false)
  return { settingsOpen, aboutOpen }
})
