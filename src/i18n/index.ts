import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      actions: {
        send: 'Send',
        save: 'Save',
        cancel: 'Cancel',
        generate: 'Generate Avatar'
      },
      chat: {
        header: {
          connecting: 'Connecting...',
          events: 'Events: {{count}}',
          language: 'Language'
        },
        sidebar: {
          sectionTitle: 'Character State',
          engineLabel: 'ENGINE',
          pendingLabel: 'PENDING',
          textModelLabel: 'Text: {{model}}'
        },
        messages: {
          streaming: 'Streaming...',
          imageAlt: 'Generated scene',
          debug: 'stress Δ {{stress}} | trust Δ {{trust}} | snapshot {{stressSnapshot}}%'
        },
        input: {
          placeholder: 'Talk to {{name}}...'
        },
        errors: {
          startupTitle: 'Startup failed',
          startupBody: 'Please review authentication or session errors.'
        },
        debug: {
          panelTitle: 'ESP READINGS',
          close: 'Close',
          logs: 'System Logs',
          noEvents: 'No system events…',
          currentState: 'Current State',
          pendingImage: 'Pending Image Prompt'
        }
      },
      settings: {
        title: 'API Config',
        modelsLabel: 'Models'
      },
      toasts: {
        apiKeyMissing: 'Please enter your API key in settings first',
        apiKeyUpdated: 'API key updated',
        avatarUpdated: 'Avatar updated',
        avatarFailed: 'Avatar generation failed',
        communicationError: 'Communication error, please check the debug panel'
      },
      labels: {
        apiKey: 'Volcengine API Key',
        textModel: 'Text Model',
        imageModel: 'Image Model'
      },
      state: {
        loading: 'Booting psychic field…',
        signIn: 'Authenticating…'
      }
    }
  },
  zh: {
    translation: {
      actions: {
        send: '发送',
        save: '保存',
        cancel: '取消',
        generate: '生成头像'
      },
      chat: {
        header: {
          connecting: '连接中…',
          events: '事件：{{count}}',
          language: '语言'
        },
        sidebar: {
          sectionTitle: '角色状态',
          engineLabel: '引擎',
          pendingLabel: '未配置',
          textModelLabel: '文本：{{model}}'
        },
        messages: {
          streaming: '思考中…',
          imageAlt: '生成场景',
          debug: '压力 Δ {{stress}} | 信任 Δ {{trust}} | 当前 {{stressSnapshot}}%'
        },
        input: {
          placeholder: '和{{name}}聊点什么…'
        },
        errors: {
          startupTitle: '启动失败',
          startupBody: '请检查认证或会话错误。'
        },
        debug: {
          panelTitle: '灵能读数',
          close: '关闭',
          logs: '系统日志',
          noEvents: '暂无事件',
          currentState: '当前状态',
          pendingImage: '待生成的图像提示'
        }
      },
      settings: {
        title: 'API 配置',
        modelsLabel: '模型'
      },
      toasts: {
        apiKeyMissing: '请先在设置中填入 API Key',
        apiKeyUpdated: 'API Key 已更新',
        avatarUpdated: '头像已更新',
        avatarFailed: '头像生成失败',
        communicationError: '通信异常，请查看调试面板'
      },
      labels: {
        apiKey: '火山引擎 API Key',
        textModel: '文本模型',
        imageModel: '图像模型'
      },
      state: {
        loading: '启动灵能领域…',
        signIn: '正在认证…'
      }
    }
  }
};

i18n
  .use(HttpBackend)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['querystring', 'localStorage', 'navigator'],
      caches: ['localStorage']
    }
  });

export default i18n;
