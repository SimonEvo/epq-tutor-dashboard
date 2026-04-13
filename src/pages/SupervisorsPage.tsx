import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useStudentStore } from '@/stores/studentStore'
import type { Supervisor } from '@/types'

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5)
}

const empty = (): Supervisor => ({ id: generateId(), name: '', gender: '', education: '', background: '', direction: '', notes: '', saType: '英方SA' })

export default function SupervisorsPage() {
  const { supervisors, fetchSupervisors, saveSupervisor, deleteSupervisor } = useStudentStore()
  const [editing, setEditing] = useState<Supervisor | null>(null)
  const [saving, setSaving] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => { fetchSupervisors() }, [fetchSupervisors])

  const handleSave = async () => {
    if (!editing || !editing.name.trim()) return
    setSaving(true)
    await saveSupervisor({ ...editing, name: editing.name.trim() })
    setSaving(false)
    setEditing(null)
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900">Supervisors (SA)</h1>
        <button
          onClick={() => setEditing(empty())}
          className="bg-indigo-600 text-white text-sm px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
        >
          + Add SA
        </button>
      </div>

      {/* Form */}
      {editing && (
        <div className="bg-white rounded-2xl border border-indigo-200 p-5 mb-6 flex flex-col gap-4">
          <h2 className="text-sm font-semibold text-gray-700">{editing.id && supervisors.find(s => s.id === editing.id) ? 'Edit SA' : 'New SA'}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Name *">
              <input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })}
                placeholder="e.g. 张三" className={inputCls} required />
            </Field>
            <Field label="Gender">
              <select value={editing.gender} onChange={e => setEditing({ ...editing, gender: e.target.value })} className={inputCls}>
                <option value="">—</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </Field>
            <Field label="SA 类型">
              <select value={editing.saType ?? '英方SA'} onChange={e => setEditing({ ...editing, saType: e.target.value as '英方SA' | '中方SA' })} className={inputCls}>
                <option value="英方SA">英方SA</option>
                <option value="中方SA">中方SA</option>
              </select>
            </Field>
            <Field label="Education">
              <input value={editing.education} onChange={e => setEditing({ ...editing, education: e.target.value })}
                placeholder="e.g. PhD, Oxford" className={inputCls} />
            </Field>
            <Field label="Work Background">
              <input value={editing.background} onChange={e => setEditing({ ...editing, background: e.target.value })}
                placeholder="e.g. Former researcher at…" className={inputCls} />
            </Field>
          </div>
          <Field label="Tutoring Direction">
            <input value={editing.direction} onChange={e => setEditing({ ...editing, direction: e.target.value })}
              placeholder="e.g. Sciences, Social Studies…" className={inputCls} />
          </Field>
          <Field label="Notes">
            <textarea value={editing.notes} onChange={e => setEditing({ ...editing, notes: e.target.value })}
              rows={2} placeholder="Optional" className={inputCls} />
          </Field>
          <div className="flex gap-2 pt-1">
            <button onClick={handleSave} disabled={saving || !editing.name.trim()}
              className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
              {saving ? 'Saving…' : 'Save'}
            </button>
            <button onClick={() => setEditing(null)}
              className="text-sm px-5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {supervisors.length === 0 && !editing ? (
        <p className="text-gray-400 text-sm text-center py-12">No supervisors yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {supervisors.map(sa => (
            <div key={sa.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between gap-2">
                <Link to={`/supervisors/${sa.id}`} className="hover:underline">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900 text-sm">{sa.name}
                      {sa.gender && <span className="text-gray-400 font-normal ml-2 text-xs">{sa.gender}</span>}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${sa.saType === '中方SA' ? 'bg-orange-50 text-orange-600' : 'bg-indigo-50 text-indigo-600'}`}>
                      {sa.saType ?? '英方SA'}
                    </span>
                  </div>
                  {sa.education && <p className="text-xs text-gray-500 mt-0.5">{sa.education}</p>}
                </Link>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => setEditing({ ...sa })}
                    className="text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                    Edit
                  </button>
                  {confirmDelete === sa.id ? (
                    <>
                      <button onClick={async () => { await deleteSupervisor(sa.id); setConfirmDelete(null) }}
                        className="text-xs px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
                        Confirm
                      </button>
                      <button onClick={() => setConfirmDelete(null)}
                        className="text-xs px-3 py-1 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(sa.id)}
                      className="text-xs px-3 py-1 border border-red-200 text-red-400 rounded-lg hover:bg-red-50 transition-colors">
                      Delete
                    </button>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {sa.background && <span>💼 {sa.background}</span>}
                {sa.direction && <span>🎯 {sa.direction}</span>}
                {sa.notes && <span className="text-gray-400 italic">{sa.notes}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {children}
    </div>
  )
}
