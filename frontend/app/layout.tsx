import './globals.css'
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Excel Import App',
  description: 'Import and manage employee data',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <nav className="bg-gray-800 p-4 text-white">
          <div className="container mx-auto flex space-x-4">
            <a href="/employees" className="hover:underline">Сотрудники</a>
            <a href="/import" className="hover:underline">Импорт</a>
          </div>
        </nav>
        <main className="container mx-auto p-4">
          {children}
        </main>
      </body>
    </html>
  )
}