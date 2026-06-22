'use client'

import { useState, useEffect } from 'react'
import ImportForm from '../components/ImportForm'
import ProgressBar from '../components/ProgressBar'
import HistoryList from '../components/HistoryList'
import { getImportHistory } from '../api/client'

export default function ImportPage() {
  const [operationId, setOperationId] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState('')
  const [history, setHistory] = useState([])
  const [ws, setWs] = useState<WebSocket | null>(null)

  useEffect(() => {
    loadHistory()
  }, [])

  useEffect(() => {
    if (!operationId) return
    const socket = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}/ws/${operationId}`)
    setWs(socket)
    socket.onmessage = (event) => {
      const data = JSON.parse(event.data)
      setProgress(data.progress)
      setStatus(data.status)
      if (data.status === 'completed' || data.status === 'failed') {
        loadHistory()
      }
    }
    return () => socket.close()
  }, [operationId])

  const loadHistory = async () => {
    const data = await getImportHistory()
    setHistory(data)
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Загрузка Excel Файла</h1>
      <ImportForm onUploadStarted={(id) => setOperationId(id)} />
      {operationId && (
        <div className="mt-4">
          <ProgressBar progress={progress} status={status} />
        </div>
      )}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-2">История Загрузок</h2>
        <HistoryList history={history} />
      </div>
    </div>
  )
}