'use client'

import { useState, useEffect } from 'react'
import { updateEmployment, createEmployment, getDepartments, getDivisions } from '../api/client'

const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"

const EMPTY_FORM = {
  full_name: '',
  department_id: '',
  division_id: '',
  position_title: '',
  supervisor_name: '',
  hire_date: '',
  fire_date: '',
  status: 'Работает',
  employment_type: 'Штатный сотрудник',
  salary: '',
}

export default function EmployeeModal({ employment, onClose, onSave }: any) {
  const isEdit = !!employment
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [departments, setDepartments] = useState<any[]>([])
  const [divisions, setDivisions] = useState<any[]>([])

  // Заполняем форму при редактировании
  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error)

    if (isEdit) {
      setForm({
        full_name: employment.employee?.full_name ?? '',
        department_id: employment.division?.department?.id ?? '',
        division_id: employment.division_id ?? '',
        position_title: employment.position?.title ?? '',
        supervisor_name: employment.supervisor?.full_name ?? '',
        hire_date: employment.hire_date ?? '',
        fire_date: employment.fire_date ?? '',
        status: employment.status ?? 'Работает',
        employment_type: employment.employment_type ?? 'Штатный сотрудник',
        salary: employment.salary ?? '',
      })
      if (employment.division?.department?.id) {
        getDivisions(employment.division.department.id).then(setDivisions)
      }
    }
  }, [])

  // При смене департамента — обновляем список отделов
  useEffect(() => {
    if (form.department_id) {
      getDivisions(Number(form.department_id)).then(setDivisions)
      setForm(f => ({ ...f, division_id: '' }))
    } else {
      setDivisions([])
    }
  }, [form.department_id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSubmit = async () => {
    if (!form.full_name.trim()) return setError('Введите ФИО сотрудника')
    if (!form.division_id) return setError('Выберите отдел')
    if (!form.position_title.trim()) return setError('Введите должность')
    if (!form.hire_date) return setError('Укажите дату приёма')
    if (!form.salary) return setError('Укажите зарплату')

    setSaving(true)
    setError(null)
    try {
      if (isEdit) {
        await updateEmployment(employment.id, {
          status: form.status,
          employment_type: form.employment_type,
          salary: Number(form.salary),
          fire_date: form.fire_date || null,
          division_id: Number(form.division_id),
        })
      } else {
        await createEmployment({
          full_name: form.full_name.trim(),
          division_id: Number(form.division_id),
          position_title: form.position_title.trim(),
          supervisor_name: form.supervisor_name.trim() || null,
          hire_date: form.hire_date,
          fire_date: form.fire_date || null,
          status: form.status,
          employment_type: form.employment_type,
          salary: Number(form.salary),
        })
      }
      onSave()
    } catch {
      setError('Не удалось сохранить изменения. Попробуйте снова.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">

        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">
            {isEdit ? 'Редактирование записи' : 'Новый сотрудник'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-6 py-4 space-y-3 overflow-y-auto">

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">ФИО сотрудника</label>
            <input
              name="full_name"
              value={form.full_name}
              onChange={handleChange}
              disabled={isEdit}
              placeholder="Иванов Иван Иванович"
              className={`${inputClass} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Департамент</label>
              <select
                name="department_id"
                value={form.department_id}
                onChange={handleChange}
                className={inputClass}
              >
                <option value="">Выберите...</option>
                {departments.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Отдел</label>
              <select
                name="division_id"
                value={form.division_id}
                onChange={handleChange}
                disabled={!form.department_id}
                className={`${inputClass} ${!form.department_id ? 'bg-gray-50 text-gray-400' : ''}`}
              >
                <option value="">Выберите...</option>
                {divisions.map((d: any) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Должность</label>
            <input
              name="position_title"
              value={form.position_title}
              onChange={handleChange}
              placeholder="менеджер проекта"
              className={inputClass}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Руководитель (ФИО)</label>
            <input
              name="supervisor_name"
              value={form.supervisor_name}
              onChange={handleChange}
              placeholder="Иванов Иван Иванович"
              className={inputClass}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата приёма</label>
              <input
                name="hire_date"
                type="date"
                value={form.hire_date}
                onChange={handleChange}
                disabled={isEdit}
                className={`${inputClass} ${isEdit ? 'bg-gray-50 text-gray-500' : ''}`}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата увольнения</label>
              <input
                name="fire_date"
                type="date"
                value={form.fire_date ?? ''}
                onChange={handleChange}
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Статус</label>
              <select name="status" value={form.status} onChange={handleChange} className={inputClass}>
                <option value="Работает">Работает</option>
                <option value="Уволен">Уволен</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Тип занятости</label>
              <select name="employment_type" value={form.employment_type} onChange={handleChange} className={inputClass}>
                <option value="Штатный сотрудник">Штатный</option>
                <option value="Внештатный сотрудник">Внештатный</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Зарплата (₽)</label>
            <input
              name="salary"
              type="number"
              step="1"
              min="0"
              value={form.salary}
              onChange={handleChange}
              className={inputClass}
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all ${
              saving
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 active:scale-95'
            }`}
          >
            {saving ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </button>
        </div>
      </div>
    </div>
  )
}