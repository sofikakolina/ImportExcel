const API_URL = process.env.NEXT_PUBLIC_API_URL

export async function importFile(file: File) {
  const formData = new FormData()
  formData.append('file', file)
  const res = await fetch(`${API_URL}/imports/`, {
    method: 'POST',
    body: formData,
  })
  if (!res.ok) throw new Error('Import failed')
  return res.json()
}

export async function getImportHistory() {
  const res = await fetch(`${API_URL}/imports/history`)
  if (!res.ok) throw new Error('Failed to fetch history')
  return res.json()
}

export async function getEmployees(filters: any) {
  const cleanFilters = Object.fromEntries(
    Object.entries(filters).filter(([_, v]) => v !== '' && v !== null && v !== undefined)
  )
  const params = new URLSearchParams(cleanFilters as any)
  const res = await fetch(`${API_URL}/employees?${params}`)
  if (!res.ok) throw new Error('Failed to fetch employees')
  return res.json()
}

export async function updateEmployment(id: number, data: any) {
  const res = await fetch(`${API_URL}/employees/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Update failed')
  return res.json()
}

export async function deleteEmployment(id: number) {
  const res = await fetch(`${API_URL}/employees/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Delete failed')
  return res.json()
}

export async function exportData(params: any) {
  const query = new URLSearchParams(params)
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/exports/?${query}`)
  if (!res.ok) throw new Error('Export failed')
  return res.json()
}

export async function getDepartments() {
  const res = await fetch(`${API_URL}/departments/`)
  if (!res.ok) throw new Error('Failed to fetch departments')
  return res.json()
}

export async function getDivisions(department_id?: number) {
  const params = department_id ? `?department_id=${department_id}` : ''
  const res = await fetch(`${API_URL}/departments/divisions${params}`)
  if (!res.ok) throw new Error('Failed to fetch divisions')
  return res.json()
}

export async function createEmployment(data: any) {
  const res = await fetch(`${API_URL}/employees/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Create failed')
  return res.json()
}