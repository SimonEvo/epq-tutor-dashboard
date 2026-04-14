import { useEffect, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useStudentStore } from '@/stores/studentStore'
import StudentFormFields, { useStudentFormState, buildStudentFromForm } from '@/components/StudentFormFields'

export default function EditStudentPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { students, saveStudent, deleteStudent, tags: globalTags, fetchTags, saveTags, rounds: globalRounds, fetchRounds, saveRounds, supervisors, fetchSupervisors } = useStudentStore()

  useEffect(() => { fetchSupervisors(); fetchRounds() }, [fetchSupervisors, fetchRounds])

  const student = students.find(s => s.id === id)
  const formState = useStudentFormState(student)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)

  if (!student) {
    return (
      <div className="p-6 text-gray-400 text-sm">
        Student not found. <Link to="/" className="text-indigo-500 underline">Back to dashboard</Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formState.name.trim() || !formState.topic.trim()) return
    setSaving(true)
    setError('')
    try {
      const updated = {
        ...student,
        ...buildStudentFromForm(formState),
      }
      await saveStudent(updated)
      navigate(`/students/${student.id}`)
    } catch (e) {
      setError(String(e))
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to={`/students/${student.id}`} className="text-gray-400 hover:text-gray-600 text-sm">
          ← {student.name}{student.nameEn ? ` · ${student.nameEn}` : ''}
        </Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Edit Student</h1>
      </div>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 flex flex-col gap-5">
        <StudentFormFields
          state={formState}
          globalTags={globalTags}
          globalRounds={globalRounds}
          supervisors={supervisors}
          onSaveTag={async (tag) => { await saveTags([...globalTags, tag]); await fetchTags() }}
          onSaveRound={async (round) => { await saveRounds([...globalRounds, round]); await fetchRounds() }}
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={saving || !formState.name.trim() || !formState.topic.trim()}
            className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
          <Link
            to={`/students/${student.id}`}
            className="text-sm px-5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            className="ml-auto text-sm px-4 py-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50 transition-colors"
          >
            删除学生
          </button>
        </div>
      </form>

      {confirmDelete && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center px-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full flex flex-col gap-4">
            <h2 className="text-base font-semibold text-gray-900">确认删除学生</h2>
            <p className="text-sm text-gray-500">
              即将永久删除学生「{student.name}」及其所有数据（会话记录、里程碑、笔记等）。此操作不可撤销。
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmDelete(false)}
                disabled={deleting}
                className="text-sm px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                onClick={async () => {
                  setDeleting(true)
                  try {
                    await deleteStudent(student.id)
                    navigate('/')
                  } catch {
                    setDeleting(false)
                    setConfirmDelete(false)
                  }
                }}
                disabled={deleting}
                className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors"
              >
                {deleting ? '删除中…' : '确认删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
