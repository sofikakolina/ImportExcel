export default function ProgressBar({ progress, status }: { progress: number, status: string }) {
  return (
    <div className="w-full bg-gray-200 rounded">
      <div className="bg-blue-600 text-xs leading-none py-1 text-center text-white rounded" style={{ width: `${progress}%` }}>
        {progress}%
      </div>
      <p>Status: {status}</p>
    </div>
  )
}