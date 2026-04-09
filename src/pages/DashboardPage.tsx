import { useEffect, useState } from 'react'
import { useStudentStore } from '@/stores/studentStore'
import StudentCard from '@/components/StudentCard'
import type { Student } from '@/types'

export default function DashboardPage() {
  const { students, tags, isLoading, error, fetchAll, fetchTags } = useStudentStore()
  const [selectedTag, setSelectedTag] = useState<string>('')
  const [sortBy, setSortBy] = useState<'name' | 'lastSession'>('lastSession')

  useEffect(() => {
    fetchAll()
    fetchTags()
  }, [fetchAll, fetchTags])

  const filtered = students
    .filter(s => !selectedTag || s.tags.includes(selectedTag))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name)
      // Sort by last session date ascending (oldest first = needs attention)
      const lastA = getLastSession(a)
      const lastB = getLastSession(b)
      if (!lastA) return -1
      if (!lastB) return 1
      return lastA < lastB ? -1 : 1
    })

  if (isLoading) return <div className="p-8 text-gray-500 text-sm">Loading students…</div>
  if (error) return <div className="p-8 text-red-500 text-sm">Error: {error}</div>

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">
          Students <span className="text-gray-400 font-normal text-lg">({students.length})</span>
        </h1>
        <a
          href="new"
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Add Student
        </a>
      </div>

      <div className="flex gap-3 mb-6 flex-wrap">
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'name' | 'lastSession')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white"
        >
          <option value="lastSession">Sort: Needs attention first</option>
          <option value="name">Sort: Name A–Z</option>
        </select>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedTag('')}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              !selectedTag
                ? 'bg-indigo-600 text-white border-indigo-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}
          >
            All
          </button>
          {tags.map(tag => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                selectedTag === tag
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-gray-400 text-sm py-16 text-center">
          {students.length === 0 ? 'No students yet. Add your first student!' : 'No students match this filter.'}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(student => (
            <StudentCard key={student.id} student={student} />
          ))}
        </div>
      )}
    </div>
  )
}

function getLastSession(student: Student): string | undefined {
  if (!student.sessions.length) return undefined
  return [...student.sessions].sort((a, b) => b.date.localeCompare(a.date))[0].date
}
