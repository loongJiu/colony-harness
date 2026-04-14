import DefaultTheme from 'vitepress/theme'
import './custom.css'

export default {
  ...DefaultTheme,
  enhanceApp({ app }) {
    // Register global components if needed in the future
    // Currently the theme is CSS-driven for maximum compatibility
  },
}
