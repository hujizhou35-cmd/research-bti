// 匿名 client_id：浏览器本地随机串，用于去重 / 识别同一浏览器的重复提交。
// 纯随机、非个人信息，不破坏匿名。持久化于 localStorage，同一浏览器复用同一串。
const CLIENT_KEY = 'gradbti.client'

function randomId(): string {
  try {
    return crypto.randomUUID()
  } catch {
    return 'c-' + Math.random().toString(36).slice(2) + Date.now().toString(36)
  }
}

export function getClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_KEY)
    if (existing) return existing
    const id = randomId()
    localStorage.setItem(CLIENT_KEY, id)
    return id
  } catch {
    // localStorage 不可用：返回临时串（本次提交仍带值，只是无法跨次去重）
    return randomId()
  }
}
