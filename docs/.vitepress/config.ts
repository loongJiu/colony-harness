const repoName = process.env.GITHUB_REPOSITORY?.split('/')[1]
const base =
  process.env.DOCS_BASE ??
  (process.env.GITHUB_ACTIONS === 'true' && repoName ? `/${repoName}/` : '/')

const socialLinks = [{ icon: 'github', link: 'https://github.com/loongJiu/colony-harness' }]

const zhThemeConfig = {
  siteTitle: 'colony-harness docs',
  nav: [
    { text: '开始', link: '/getting-started-5min' },
    { text: '概念', link: '/runtime-lifecycle' },
    { text: '实战', link: '/cookbook-research-agent' },
    { text: 'API', link: '/api-reference' },
    { text: '发布', link: '/release-workflow' },
  ],
  sidebar: [
    {
      text: '快速上手',
      items: [
        { text: '文档首页', link: '/' },
        { text: '5 分钟跑通', link: '/getting-started-5min' },
        { text: 'Quickstart', link: '/quickstart' },
        { text: '示例运行指南', link: '/examples-running' },
        { text: '环境变量参考', link: '/environment-variables' },
        { text: '常见问题排查', link: '/troubleshooting' },
      ],
    },
    {
      text: '核心概念',
      items: [
        { text: '运行生命周期', link: '/runtime-lifecycle' },
        { text: 'Guardrails 与工具安全', link: '/guardrails-tool-security' },
        { text: 'Architecture', link: '/architecture' },
        { text: '双运行模式', link: '/controlplane-modes' },
        { text: '兼容矩阵', link: '/controlplane-compatibility-matrix' },
      ],
    },
    {
      text: '实战与参考',
      items: [
        { text: 'Cookbook: 研究助手 Agent', link: '/cookbook-research-agent' },
        { text: 'Advanced Guide', link: '/advanced-guide' },
        { text: 'API Reference', link: '/api-reference' },
        { text: 'Evals', link: '/evals' },
      ],
    },
    {
      text: '维护与发布',
      items: [
        { text: 'Changelog Guidelines', link: '/changelog-guidelines' },
        { text: 'Release Workflow', link: '/release-workflow' },
        { text: 'ADR: 边界冻结', link: '/adr/0001-harness-controlplane-boundary' },
      ],
    },
  ],
  socialLinks,
  editLink: {
    pattern: 'https://github.com/loongJiu/colony-harness/edit/release/mvp-v1.0.0/docs/:path',
    text: '在 GitHub 上编辑此页',
  },
  lastUpdatedText: '最后更新',
  outline: {
    level: [2, 3],
    label: '页面目录',
  },
  docFooter: {
    prev: '上一篇',
    next: '下一篇',
  },
  search: {
    provider: 'local',
  },
  footer: {
    message: 'Released under the MIT License.',
    copyright: 'Copyright © colony-harness contributors',
  },
}

const enThemeConfig = {
  siteTitle: 'colony-harness docs',
  nav: [
    { text: 'Start', link: '/en/getting-started-5min' },
    { text: 'Concepts', link: '/en/runtime-lifecycle' },
    { text: 'Cookbook', link: '/en/cookbook-research-agent' },
    { text: 'API', link: '/en/api-reference' },
    { text: 'Release', link: '/en/release-workflow' },
  ],
  sidebar: [
    {
      text: 'Getting Started',
      items: [
        { text: 'Docs Home', link: '/en/' },
        { text: 'Get Running in 5 Minutes', link: '/en/getting-started-5min' },
        { text: 'Quickstart', link: '/en/quickstart' },
        { text: 'Running the Examples', link: '/en/examples-running' },
        { text: 'Environment Variables', link: '/en/environment-variables' },
        { text: 'Troubleshooting', link: '/en/troubleshooting' },
      ],
    },
    {
      text: 'Core Concepts',
      items: [
        { text: 'Runtime Lifecycle', link: '/en/runtime-lifecycle' },
        { text: 'Guardrails & Tool Security', link: '/en/guardrails-tool-security' },
        { text: 'Architecture', link: '/en/architecture' },
        { text: 'Dual Runtime Modes', link: '/en/controlplane-modes' },
        { text: 'Compatibility Matrix', link: '/en/controlplane-compatibility-matrix' },
      ],
    },
    {
      text: 'Cookbook & Reference',
      items: [
        { text: 'Research Agent Cookbook', link: '/en/cookbook-research-agent' },
        { text: 'Advanced Guide', link: '/en/advanced-guide' },
        { text: 'API Reference', link: '/en/api-reference' },
        { text: 'Evals', link: '/en/evals' },
      ],
    },
    {
      text: 'Maintenance & Release',
      items: [
        { text: 'Changelog Guidelines', link: '/en/changelog-guidelines' },
        { text: 'Release Workflow', link: '/en/release-workflow' },
        { text: 'ADR: Boundary Freeze', link: '/adr/0001-harness-controlplane-boundary' },
      ],
    },
  ],
  socialLinks,
  editLink: {
    pattern: 'https://github.com/loongJiu/colony-harness/edit/release/mvp-v1.0.0/docs/:path',
    text: 'Edit this page on GitHub',
  },
  lastUpdatedText: 'Last updated',
  outline: {
    level: [2, 3],
    label: 'On this page',
  },
  docFooter: {
    prev: 'Previous page',
    next: 'Next page',
  },
  search: {
    provider: 'local',
  },
  footer: {
    message: 'Released under the MIT License.',
    copyright: 'Copyright © colony-harness contributors',
  },
}

export default {
  title: 'colony-harness',
  description: 'Production-ready AI agent harness documentation',
  base,
  lang: 'zh-CN',
  head: [['meta', { name: 'theme-color', content: '#0f766e' }]],
  cleanUrls: true,
  lastUpdated: true,
  locales: {
    root: {
      label: '简体中文',
      lang: 'zh-CN',
      link: '/',
      themeConfig: zhThemeConfig,
    },
    en: {
      label: 'English',
      lang: 'en-US',
      link: '/en/',
      title: 'colony-harness',
      description: 'Production-ready AI agent harness documentation',
      themeConfig: enThemeConfig,
    },
  },
}
