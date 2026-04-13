const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.DOCS_BASE ??
  (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/')

export default {
  title: 'colony-harness',
  description: 'Production-ready AI agent harness documentation',
  base,
  lang: 'zh-CN',
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: 'Quickstart', link: '/quickstart' },
      { text: 'Advanced', link: '/advanced-guide' },
      { text: 'API', link: '/api-reference' },
      { text: 'Release', link: '/release-workflow' },
    ],
    sidebar: [
      {
        text: '指南',
        items: [
          { text: '文档索引', link: '/' },
          { text: 'Quickstart', link: '/quickstart' },
          { text: 'Advanced Guide', link: '/advanced-guide' },
          { text: 'Architecture', link: '/architecture' },
        ],
      },
      {
        text: '参考',
        items: [
          { text: 'API Reference', link: '/api-reference' },
          { text: 'Evals', link: '/evals' },
          { text: 'Changelog Guidelines', link: '/changelog-guidelines' },
          { text: 'Release Workflow', link: '/release-workflow' },
        ],
      },
    ],
    socialLinks: [{ icon: 'github', link: 'https://github.com/loongJiu/colony-harness' }],
    search: {
      provider: 'local',
    },
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © colony-harness contributors',
    },
  },
}
