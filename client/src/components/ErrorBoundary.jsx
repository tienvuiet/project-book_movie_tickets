import { Component } from 'react'
import Button from './Button'

export default class ErrorBoundary extends Component {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) {
      return (
        <div className="grid min-h-screen place-items-center bg-dark-950 p-6">
          <div className="max-w-md rounded-2xl glass-strong shadow-glass-lg p-8 text-center animate-scale-in">
            <p className="text-5xl font-black text-gradient">Oops!</p>
            <h1 className="mt-3 text-xl font-semibold text-white">Đã có lỗi xảy ra</h1>
            <p className="mt-2 text-sm text-dark-400">Vui lòng tải lại trang hoặc thử lại sau.</p>
            <Button className="mt-6" onClick={() => window.location.reload()}>Tải lại</Button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
