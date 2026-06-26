// vibe 徽章语义色（§7.2）：高危→红、稀有→金、棘手→橙、常见/少见→灰。
export interface VibeStyle {
  /** 背景色（CSS 值） */
  bg: string
  /** 文字色 */
  fg: string
  label: string
}

export function vibeStyle(vibe: string): VibeStyle {
  switch (vibe) {
    case '高危':
      return { bg: 'var(--stamp)', fg: '#fff', label: vibe }
    case '稀有':
      return { bg: 'var(--marker)', fg: 'var(--ink)', label: vibe }
    case '棘手':
      return { bg: '#C2701C', fg: '#fff', label: vibe }
    default: // 常见 / 少见
      return { bg: 'var(--grid)', fg: 'var(--ink)', label: vibe }
  }
}
