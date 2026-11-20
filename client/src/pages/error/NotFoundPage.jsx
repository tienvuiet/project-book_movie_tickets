import { Link } from 'react-router-dom'
import Button from '../../components/Button'

export default function NotFoundPage() {
  return (
    <div className="max-w-md rounded-2xl glass-strong shadow-glass-lg p-8 text-center animate-scale-in">
      <p className="text-7xl font-black text-gradient">404</p>
      <h1 className="mt-3 text-2xl font-bold text-white">Không tìm thấy trang</h1>
      <p className="mt-2 text-sm text-dark-400">Trang bạn đang tìm kiếm không tồn tại hoặc đã bị di chuyển.</p>
      <Link to="/">
        <Button className="mt-6">Về trang chủ</Button>
      </Link>
    </div>
  )
}
