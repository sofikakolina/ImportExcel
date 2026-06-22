export default function HistoryList({ history }: { history: any[] }) {
  return (
    <table className="w-full border">
      <thead>
        <tr className="bg-gray-100">
          <th className="p-2 border">ID</th>
          <th className="p-2 border">Дата Загрузки</th>
          <th className="p-2 border">Статус</th>
          <th className="p-2 border">Результат</th>
          <th className="p-2 border">Ошибка</th>
        </tr>
      </thead>
      <tbody>
        {history.map((item) => (
          <tr key={item.id}>
            <td className="p-2 border">{item.id}</td>
            <td className="p-2 border">{new Date(item.started_at).toLocaleString()}</td>
            <td className="p-2 border">{item.status}</td>
            <td className="p-2 border">{item.result}</td>
            <td className="p-2 border">{item.errors}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}