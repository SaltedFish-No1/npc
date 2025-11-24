import { defineConfig } from 'vitepress';
import mdMermaid from 'markdown-it-mermaid';

export default defineConfig({
  lang: 'zh-CN',
  title: 'NPC Backend Docs',
  description: 'Headless NPC 服务的使用说明与 API 参考',
  markdown: {
    config: (md) => {
      const plugin = (mdMermaid as unknown as { default?: unknown }).default ?? mdMermaid;
      md.use(plugin as any);
    }
  },
  themeConfig: {
    nav: [
      { text: '使用说明', link: '/' },
      { text: 'API 参考', link: '/api/' },
      { text: '架构说明', link: '/service-arch' },
      { text: '角色模型', link: '/digital-persona' },
      { text: '开发计划', link: '/dev-plan' }
    ],
    sidebar: {
      '/api/': [
        {
          text: 'API 参考',
          items: [
            { text: '概览', link: '/api/' },
            { text: '角色与会话', link: '/api/#角色与会话' },
            { text: '聊天接口', link: '/api/#聊天接口' },
            { text: '图片与头像', link: '/api/#图片与头像' },
            { text: '记忆与其他', link: '/api/#记忆与其他' }
          ]
        }
      ],
      '/': [
        {
          text: '使用说明',
          items: [
            { text: '快速开始', link: '/' },
            { text: '运行方式', link: '/#运行方式' },
            { text: '文档站点指令', link: '/#文档站点' }
          ]
        },
        {
          text: '角色建模',
          items: [
            { text: 'DigitalPersona v2', link: '/digital-persona' }
          ]
        },
        {
          text: '项目规划',
          items: [
            { text: '新增开发计划', link: '/dev-plan' }
          ]
        }
      ]
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/SaltedFish-No1/npc' }
    ],
    footer: {
      message: 'NPC Backend Docs — 由 VitePress 驱动'
    }
  }
});
