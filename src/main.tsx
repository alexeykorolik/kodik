import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'

class AppBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    return this.state.failed ? <main className="app-shell"><section className="finish-screen"><h1>Не удалось открыть занятие</h1><p>Попробуй обновить страницу. Сохранённый прогресс останется на этом устройстве.</p><button className="primary-button" onClick={() => window.location.reload()}>Обновить страницу</button></section></main> : this.props.children
  }
}
createRoot(document.getElementById('root')!).render(<StrictMode><AppBoundary><App /></AppBoundary></StrictMode>)
