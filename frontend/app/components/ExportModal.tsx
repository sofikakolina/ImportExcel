'use client'

import { useState } from 'react'
import { exportData } from '../api/client'

const TABLE_OPTIONS = [
  { id: 'employees', label: 'Сотрудники' },
  { id: 'departments', label: 'Департаменты' },
  { id: 'divisions', label: 'Отделы' },
  { id: 'positions', label: 'Должности' },
]

export default function ExportModal({
  onClose,
  onExportStarted
}: {
  onClose: () => void
  onExportStarted: (operationId: string) => void
}) {
  const [selected, setSelected] = useState<string[]>(['employees', 'departments'])
  const [format, setFormat] = useState('xlsx')
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleTable = (id: string) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    )
  }

  
  const handleExport = async () => {
    if (selected.length === 0) {
      setError('Выберите хотя бы один раздел для экспорта.')
      return
    }
    setExporting(true)
    setError(null)
    try {
      const result = await exportData({ tables: selected.join(','), format })
      onExportStarted(result.operation_id) 
    } catch {
      setError('Не удалось запустить экспорт. Попробуйте снова.')
      setExporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">

        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Экспорт данных</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 space-y-4">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Разделы для экспорта</label>
            <div className="space-y-2">
              {TABLE_OPTIONS.map(({ id, label }) => (
                <label key={id} className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={selected.includes(id)}
                    onChange={() => toggleTable(id)}
                    className="w-4 h-4 accent-blue-600"
                  />
                  <span className="text-sm text-gray-700 group-hover:text-gray-900">{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Формат файла</label>
            <div className="flex gap-3">
              {[
                { value: 'xlsx', label: 'XLSX' },
                { value: 'csv', label: 'CSV' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormat(value)}
                  className={`flex-1 py-2 text-sm rounded-lg border transition-colors ${
                    format === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700 font-medium'
                      : 'border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleExport}
            disabled={exporting || selected.length === 0}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              exporting || selected.length === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-green-600 text-white hover:bg-green-700 active:scale-95'
            }`}
          >
            {exporting ? 'Экспорт...' : 'Экспортировать'}
          </button>
        </div>
      </div>
    </div>
  )
}