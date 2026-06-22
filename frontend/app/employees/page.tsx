'use client'

import { useState, useEffect, useRef } from 'react'
import EmployeeTable from '../components/EmployeeTable'
import EmployeeModal from '../components/EmployeeModal'
import ExportModal from '../components/ExportModal'
import { getEmployees, deleteEmployment, getDepartments, getDivisions } from '../api/client'

const WS_URL = process.env.NEXT_PUBLIC_WS_URL

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [departments, setDepartments] = useState<any[]>([])
  const [divisions, setDivisions] = useState<any[]>([])
  const [filters, setFilters] = useState({
    search: '',
    department_id: '',
    division_id: '',
    status: '',
    as_of_date: '',
    employment_type: '',
  })
  const [editing, setEditing] = useState<any>(null)
  const [showExport, setShowExport] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)
  const exportWsRef = useRef<WebSocket | null>(null)
  const [showCreate, setShowCreate] = useState(false)

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error)
  }, [])

  // При смене департамента — загружаем отделы и сбрасываем выбранный отдел
  useEffect(() => {
    if (filters.department_id) {
      getDivisions(Number(filters.department_id)).then(setDivisions).catch(console.error)
    } else {
      getDivisions().then(setDivisions).catch(console.error)
    }
    setFilters(f => ({ ...f, division_id: '' }))
  }, [filters.department_id])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const data = await getEmployees(filters)
      setEmployees(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [filters])

  const handleDelete = async (id: number) => {
    if (!confirm('Вы уверены, что хотите удалить эту запись?')) return
    await deleteEmployment(id)
    loadEmployees()
  }

  const handleExportStarted = (operationId: string) => {
    setShowExport(false)
    setExportStatus('Экспорт выполняется...')
    const ws = new WebSocket(`${WS_URL}/ws/${operationId}`)
    exportWsRef.current = ws
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      if (data.status === 'completed') {
        setExportStatus('Экспорт завершён — файл скачивается...')
        const link = document.createElement('a')
        link.href = `${process.env.NEXT_PUBLIC_API_URL}/exports/download/${operationId}`
        link.download = 'export.xlsx'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => setExportStatus(null), 3000)
        ws.close()
      } else if (data.status === 'failed') {
        setExportStatus(`Ошибка экспорта: ${data.error ?? 'неизвестная ошибка'}`)
        ws.close()
      }
    }
    ws.onerror = () => setExportStatus('Ошибка WebSocket соединения')
  }

  const resetFilters = () => setFilters({
    search: '', department_id: '', division_id: '',
    status: '', as_of_date: '', employment_type: '',
  })

  const inputClass = "border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"

  return (
    <div className="p-6 max-w-screen-xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Сотрудники</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            + Добавить сотрудника
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
          >
            Экспорт
          </button>
        </div>
      </div>

      {exportStatus && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm flex items-center justify-between ${
          exportStatus.startsWith('Ошибка')
            ? 'bg-red-50 text-red-700 border border-red-200'
            : 'bg-green-50 text-green-700 border border-green-200'
        }`}>
          <span>{exportStatus}</span>
          <button onClick={() => setExportStatus(null)} className="text-lg leading-none opacity-50 hover:opacity-100">×</button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Поиск по ФИО..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className={`${inputClass} flex-1 min-w-48`}
          />

          <select
            value={filters.department_id}
            onChange={(e) => setFilters({ ...filters, department_id: e.target.value })}
            className={inputClass}
          >
            <option value="">Все департаменты</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={filters.division_id}
            onChange={(e) => setFilters({ ...filters, division_id: e.target.value })}
            className={inputClass}
          >
            <option value="">Все отделы</option>
            {divisions.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>

          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
            className={inputClass}
          >
            <option value="">Все статусы</option>
            <option value="Работает">Работает</option>
            <option value="Уволен">Уволен</option>
          </select>

          <select
            value={filters.employment_type}
            onChange={(e) => setFilters({ ...filters, employment_type: e.target.value })}
            className={inputClass}
          >
            <option value="">Все типы</option>
            <option value="Штатный сотрудник">Штатный</option>
            <option value="Внештатный сотрудник">Внештатный</option>
          </select>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-500 whitespace-nowrap">Дата актуальности:</label>
            <input
              type="date"
              value={filters.as_of_date}
              onChange={(e) => setFilters({ ...filters, as_of_date: e.target.value })}
              className={inputClass}
            />
          </div>

          <button
            onClick={resetFilters}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Сбросить
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-3xl mb-2">⏳</p>
          <p className="text-sm">Загрузка данных...</p>
        </div>
      ) : (
        <EmployeeTable employees={employees} onEdit={setEditing} onDelete={handleDelete} />
      )}

      {editing && (
        <EmployeeModal
          employment={editing}
          onClose={() => { setEditing(null); loadEmployees() }}
          onSave={() => { setEditing(null); loadEmployees() }}
        />
      )}

      {showExport && (
        <ExportModal onClose={() => setShowExport(false)} onExportStarted={handleExportStarted} />
      )}

      {showCreate && (
        <EmployeeModal
          employment={null}
          onClose={() => setShowCreate(false)}
          onSave={() => { setShowCreate(false); loadEmployees() }}
        />
      )}
    </div>
  )
}