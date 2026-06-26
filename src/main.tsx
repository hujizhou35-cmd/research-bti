import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// 字体 @font-face 在 index.css 中自托管子集引用（族名与 avatars/*.svg 对齐）。
import './styles/index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
