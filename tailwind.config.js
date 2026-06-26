/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // §7.2 调色板 —— 全站只用这些
      colors: {
        paper: '#ECEAE3', // 检验单纸张：冷灰白
        'paper-2': '#E2DFD5', // 次级纸面 / 卡片分区底
        ink: '#1A1A17', // 墨黑正文与边框
        stamp: '#B5322B', // 钢印正红：唯一大胆色
        marker: '#E2A100', // 记号笔黄：批注高亮
        grid: '#C9C6BC', // 网格线 / 表单分隔线
        // vibe 徽章语义色
        'vibe-tricky': '#C2701C', // 棘手 橙
      },
      fontFamily: {
        // §7.3 三个字体角色
        display: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        body: ['"PingFang SC"', '"Microsoft YaHei"', '"Hiragino Sans GB"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"DM Mono"', '"Courier New"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // 单据是方角的
        none: '0',
      },
      keyframes: {
        'stamp-drop': {
          '0%': { opacity: '0', transform: 'scale(2.6) rotate(-28deg)' },
          '70%': { opacity: '1', transform: 'scale(0.92) rotate(-11deg)' },
          '85%': { transform: 'scale(1.04) rotate(-14deg)' },
          '100%': { opacity: '1', transform: 'scale(1) rotate(-13deg)' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'scan-expand': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
      animation: {
        'stamp-drop': 'stamp-drop 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'fade-in': 'fade-in 0.35s ease-out both',
        'scan-expand': 'scan-expand 0.7s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
    },
  },
  plugins: [],
}
