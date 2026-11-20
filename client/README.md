# CGV Cinemas Client

## Tao project va cai thu vien

```bash
npm create vite@latest client -- --template react
npm install axios react-router-dom @reduxjs/toolkit react-redux react-hook-form zod @hookform/resolvers lucide-react recharts date-fns clsx
npm install -D tailwindcss postcss autoprefixer
```

## Chay local

```bash
cd client
npm install
npm run dev
```

Frontend goi `/api` va ket noi WebSocket tai `/ws` qua Vite proxy den backend
`localhost:8080`. Chay backend truoc khi su dung cac chuc nang cua ung dung.
