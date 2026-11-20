import { Outlet } from 'react-router-dom'

export default function ErrorLayout() {
  return (
    <main className="grid min-h-screen place-items-center bg-dark-950 p-6">
      <Outlet />
    </main>
  )
}
