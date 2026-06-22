'use client'

import { useState, useCallback } from 'react'
import { importFile } from '../api/client'

export default function ImportForm({ onUploadStarted }: { onUploadStarted: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (f: File | null) => {
    setError(null)
    if (!f) return setFile(null)
    const allowed = ['.xlsx', '.xls', '.xlsb']
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!allowed.includes(ext)) {
      setError(`Неподдерживаемый формат. Допустимые: ${allowed.join(', ')}`)
      return
    }
    setFile(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFile(e.dataTransfer.files?.[0] || null)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const result = await importFile(file)
      onUploadStarted(result.operation_id)
      setFile(null)
    } catch (err) {
      setError('Ошибка загрузки файла. Проверьте соединение и попробуйте снова.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-800 mb-4">Загрузка файла</h2>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => document.getElementById('file-input')?.click()}
        className={`
          relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-blue-300 hover:bg-gray-50'}
          ${file ? 'border-green-400 bg-green-50' : ''}
        `}
      >
        <input
          id="file-input"
          type="file"
          accept=".xlsx,.xls,.xlsb"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0] || null)}
        />

        {file ? (
          <div className="flex items-center justify-center gap-3">
            <span className="text-2xl">📄</span>
            <div className="text-left">
              <p className="font-medium text-gray-800 text-sm">{file.name}</p>
              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setFile(null) }}
              className="ml-2 text-gray-400 hover:text-red-500 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>
        ) : (
          <div>
            <p className="text-3xl mb-2">📂</p>
            <p className="text-sm font-medium text-gray-700">
              Перетащите файл сюда или <span className="text-blue-500">выберите</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">Поддерживаются: .xlsx, .xls, .xlsb</p>
          </div>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <button
        onClick={handleSubmit}
        disabled={!file || uploading}
        className={`
          mt-4 w-full py-2.5 px-4 rounded-lg font-medium text-sm transition-all
          ${!file || uploading
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
          }
        `}
      >
        {uploading ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
            Загрузка...
          </span>
        ) : 'Загрузить файл'}
      </button>
    </div>
  )
}