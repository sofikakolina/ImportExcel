export default function EmployeeTable({ employees, onEdit, onDelete }: any) {
  return (
    <div className="rounded-xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left" style={{ minWidth: '900px' }}>
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-4 py-3 border-b font-medium">ФИО</th>
              <th className="px-4 py-3 border-b font-medium">Департамент</th>
              <th className="px-4 py-3 border-b font-medium">Отдел</th>
              <th className="px-4 py-3 border-b font-medium">Должность</th>
              <th className="px-4 py-3 border-b font-medium">Руководитель</th>
              <th className="px-4 py-3 border-b font-medium">Дата приёма</th>
              <th className="px-4 py-3 border-b font-medium">Дата увольнения</th>
              <th className="px-4 py-3 border-b font-medium">Тип</th>
              <th className="px-4 py-3 border-b font-medium">Зарплата</th>
              <th className="px-4 py-3 border-b font-medium">Статус</th>
              <th className="px-4 py-3 border-b font-medium bg-white sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {employees.map((emp: any) => (
              <tr key={emp.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">{emp.employee?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.division?.department?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.division?.name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.position?.title ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.supervisor?.full_name ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.hire_date ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{emp.fire_date ?? '—'}</td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    emp.employment_type === 'Штатный сотрудник'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-purple-50 text-purple-700'
                  }`}>
                    {emp.employment_type === 'Штатный сотрудник' ? 'Штатный' : 'Внештатный'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                  {emp.salary ? Number(emp.salary).toLocaleString('ru-RU') + ' ₽' : '—'}
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    emp.status === 'Работает'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-600'
                  }`}>
                    {emp.status}
                  </span>
                </td>

                {/* Фиксированная колонка действий */}
                <td className="px-4 py-3 bg-white sticky right-0 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.08)]">
                  <div className="flex gap-1">
                    <button
                      onClick={() => onEdit(emp)}
                      title="Редактировать"
                      className="p-1.5 rounded-lg bg-amber-50 text-amber-600 hover:bg-amber-100 transition-colors"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => onDelete(emp.id)}
                      title="Удалить"
                      className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-colors"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {employees.length === 0 && (
        <div className="text-center py-12 text-gray-400 bg-white">
          <p className="text-3xl mb-2">📭</p>
          <p className="text-sm">Нет данных для отображения</p>
        </div>
      )}

      {/* Подсказка о скролле на мобильных */}
      <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-400 flex items-center gap-1 sm:hidden">
        <span>←</span>
        <span>Прокрутите таблицу горизонтально</span>
        <span>→</span>
      </div>
    </div>
  )
}