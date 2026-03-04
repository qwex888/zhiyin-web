import { createI18n } from 'vue-i18n'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

// 获取浏览器语言
// const getBrowserLanguage = () => {
//   const navigatorLanguage = navigator.language
//   if (navigatorLanguage.startsWith('zh')) {
//     return 'zh-CN'
//   }
//   return 'zh-CN' // 默认中文
// }

const i18n = createI18n({
  legacy: false, // 使用 Composition API
  locale: 'zh-CN', // 默认语言
  fallbackLocale: 'en-US',
  messages: {
    'zh-CN': zhCN,
    'en-US': enUS
  }
})

export default i18n
