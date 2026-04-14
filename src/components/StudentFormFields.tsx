import { useState } from 'react'
import type { Student, Supervisor } from '@/types'

// ── Shared form state hook ────────────────────────────────────────────────────

export interface StudentFormState {
  name: string; setName: (v: string) => void
  nameEn: string; setNameEn: (v: string) => void
  gender: string; setGender: (v: string) => void
  school: string; setSchool: (v: string) => void
  currentGrade: string; setCurrentGrade: (v: string) => void
  universityEnrollment: string; setUniversityEnrollment: (v: string) => void
  submissionRound: string; setSubmissionRound: (v: string) => void
  taughtElementType: string; setTaughtElementType: (v: string) => void
  universityAspiration: string; setUniversityAspiration: (v: string) => void
  contact: string; setContact: (v: string) => void
  topic: string; setTopic: (v: string) => void
  overview: string; setOverview: (v: string) => void
  saTotal: number; setSaTotal: (v: number) => void
  availabilityNote: string; setAvailabilityNote: (v: string) => void
  briefNote: string; setBriefNote: (v: string) => void
  privateNotes: string; setPrivateNotes: (v: string) => void
  tencentDocUrl: string; setTencentDocUrl: (v: string) => void
  selectedTags: string[]; setSelectedTags: (v: string[]) => void
  supervisorId: string; setSupervisorId: (v: string) => void
}

export function useStudentFormState(initial?: Partial<Student>): StudentFormState {
  const [name, setName] = useState(initial?.name ?? '')
  const [nameEn, setNameEn] = useState(initial?.nameEn ?? '')
  const [gender, setGender] = useState(initial?.gender ?? '')
  const [school, setSchool] = useState(initial?.school ?? '')
  const [currentGrade, setCurrentGrade] = useState(initial?.currentGrade ?? '')
  const [universityEnrollment, setUniversityEnrollment] = useState(initial?.universityEnrollment ?? '')
  const [submissionRound, setSubmissionRound] = useState(initial?.submissionRound ?? '')
  const [taughtElementType, setTaughtElementType] = useState(initial?.taughtElementType ?? '')
  const [universityAspiration, setUniversityAspiration] = useState(initial?.universityAspiration ?? '')
  const [contact, setContact] = useState(initial?.contact ?? '')
  const [topic, setTopic] = useState(initial?.topic ?? '')
  const [overview, setOverview] = useState(initial?.overview ?? '')
  const [saTotal, setSaTotal] = useState(initial?.saHoursTotal ?? 12)
  const [availabilityNote, setAvailabilityNote] = useState(initial?.availabilityNote ?? '')
  const [briefNote, setBriefNote] = useState(initial?.briefNote ?? '')
  const [privateNotes, setPrivateNotes] = useState(initial?.privateNotes ?? '')
  const [tencentDocUrl, setTencentDocUrl] = useState(initial?.tencentDocUrl ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(initial?.tags ?? [])
  const [supervisorId, setSupervisorId] = useState(initial?.supervisorId ?? '')

  return {
    name, setName, nameEn, setNameEn, gender, setGender,
    school, setSchool, currentGrade, setCurrentGrade,
    universityEnrollment, setUniversityEnrollment,
    submissionRound, setSubmissionRound,
    taughtElementType, setTaughtElementType,
    universityAspiration, setUniversityAspiration, contact, setContact,
    topic, setTopic, overview, setOverview, saTotal, setSaTotal,
    supervisorId, setSupervisorId,
    availabilityNote, setAvailabilityNote, briefNote, setBriefNote,
    privateNotes, setPrivateNotes, tencentDocUrl, setTencentDocUrl,
    selectedTags, setSelectedTags,
  }
}

export function buildStudentFromForm(f: StudentFormState): Omit<Student, 'id' | 'saHoursUsed' | 'personalEntries' | 'milestones' | 'sessions' | 'createdAt' | 'updatedAt'> {
  return {
    name: f.name.trim(),
    nameEn: f.nameEn.trim() || undefined,
    gender: f.gender.trim() || undefined,
    school: f.school.trim() || undefined,
    currentGrade: f.currentGrade.trim() || undefined,
    universityEnrollment: f.universityEnrollment.trim() || undefined,
    submissionRound: f.submissionRound.trim() || undefined,
    taughtElementType: f.taughtElementType.trim() || undefined,
    universityAspiration: f.universityAspiration.trim() || undefined,
    contact: f.contact.trim() || undefined,
    topic: f.topic.trim(),
    overview: f.overview.trim() || undefined,
    supervisorId: f.supervisorId || undefined,
    tags: f.selectedTags,
    saHoursTotal: f.saTotal,
    availabilityNote: f.availabilityNote.trim(),
    briefNote: f.briefNote.trim(),
    privateNotes: f.privateNotes.trim(),
    tencentDocUrl: f.tencentDocUrl.trim() || undefined,
    mindMaps: [],
  }
}

// ── Shared form UI ─────────────────────────────────────────────────────────────

interface Props {
  state: StudentFormState
  globalTags: string[]
  globalRounds: string[]
  supervisors: Supervisor[]
  onSaveTag: (tag: string) => Promise<void>
  onSaveRound: (round: string) => Promise<void>
}

export default function StudentFormFields({ state, globalTags, globalRounds, supervisors, onSaveTag, onSaveRound }: Props) {
  const [newTag, setNewTag] = useState('')
  const [newRound, setNewRound] = useState('')

  const toggleTag = (tag: string) => {
    state.setSelectedTags(
      state.selectedTags.includes(tag)
        ? state.selectedTags.filter(t => t !== tag)
        : [...state.selectedTags, tag]
    )
  }

  const addNewTag = async () => {
    const t = newTag.trim()
    if (!t || globalTags.includes(t)) return
    await onSaveTag(t)
    state.setSelectedTags([...state.selectedTags, t])
    setNewTag('')
  }

  return (
    <>
      {/* Section: Basic Info */}
      <SectionTitle>Basic Info</SectionTitle>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Chinese Name *">
          <input value={state.name} onChange={e => state.setName(e.target.value)}
            placeholder="e.g. 王晓明" className={inputCls} required />
        </Field>
        <Field label="English Name">
          <input value={state.nameEn} onChange={e => state.setNameEn(e.target.value)}
            placeholder="e.g. Alice Wang" className={inputCls} />
        </Field>
        <Field label="Gender">
          <select value={state.gender} onChange={e => state.setGender(e.target.value)} className={inputCls}>
            <option value="">—</option>
            <option value="Male">男</option>
            <option value="Female">女</option>
            <option value="Other">其他</option>
          </select>
        </Field>
        <Field label="School">
          <input value={state.school} onChange={e => state.setSchool(e.target.value)}
            placeholder="e.g. Beijing No.1 High School" className={inputCls} />
        </Field>
        <Field label="Current Grade">
          <input value={state.currentGrade} onChange={e => state.setCurrentGrade(e.target.value)}
            placeholder="e.g. G11 / Year 12" className={inputCls} />
        </Field>
        <Field label="University Enrollment">
          <input value={state.universityEnrollment} onChange={e => state.setUniversityEnrollment(e.target.value)}
            placeholder="e.g. September 2026" className={inputCls} />
        </Field>
        <Field label="Submission Round">
          <div className="flex gap-2">
            <select value={state.submissionRound} onChange={e => state.setSubmissionRound(e.target.value)} className={`${inputCls} flex-1`}>
              <option value="">— Select —</option>
              {globalRounds.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <input
              value={newRound}
              onChange={e => setNewRound(e.target.value)}
              onKeyDown={async e => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  const r = newRound.trim()
                  if (!r || globalRounds.includes(r)) return
                  await onSaveRound(r)
                  state.setSubmissionRound(r)
                  setNewRound('')
                }
              }}
              placeholder="New round…"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-28"
            />
            <button
              type="button"
              onClick={async () => {
                const r = newRound.trim()
                if (!r || globalRounds.includes(r)) return
                await onSaveRound(r)
                state.setSubmissionRound(r)
                setNewRound('')
              }}
              disabled={!newRound.trim()}
              className="text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40"
            >
              Add
            </button>
          </div>
        </Field>
        <Field label="理论课班期">
          <input value={state.taughtElementType} onChange={e => state.setTaughtElementType(e.target.value)}
            placeholder="e.g. 2025年秋季班 / Science Cohort A" className={inputCls} />
        </Field>
        <Field label="Contact">
          <input value={state.contact} onChange={e => state.setContact(e.target.value)}
            placeholder="e.g. WeChat ID / email" className={inputCls} />
        </Field>
      </div>
      <Field label="University Aspiration / Goal">
        <textarea value={state.universityAspiration} onChange={e => state.setUniversityAspiration(e.target.value)}
          placeholder="e.g. Oxbridge, Russell Group, specific course…" rows={2} className={inputCls} />
      </Field>

      {/* Section: EPQ */}
      <SectionTitle>EPQ Details</SectionTitle>
      <Field label="Research Topic *">
        <textarea value={state.topic} onChange={e => state.setTopic(e.target.value)}
          placeholder="e.g. The impact of social media on adolescent mental health"
          rows={2} className={inputCls} required />
      </Field>
      <Field label="Overview" hint="Short phrase shown on the dashboard card, e.g. 脑机接口">
        <input value={state.overview} onChange={e => state.setOverview(e.target.value)}
          placeholder="e.g. 脑机接口 / AI in healthcare" className={inputCls} />
      </Field>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Supervisor (SA)">
          <select value={state.supervisorId} onChange={e => state.setSupervisorId(e.target.value)} className={inputCls}>
            <option value="">— Unassigned —</option>
            {supervisors.map(sa => (
              <option key={sa.id} value={sa.id}>{sa.name}</option>
            ))}
          </select>
        </Field>
        <Field label="SA Hours Quota">
          <input type="number" min={0} value={state.saTotal}
            onChange={e => state.setSaTotal(Number(e.target.value))} className={inputCls} />
        </Field>
      </div>

      {/* Section: Tags */}
      <SectionTitle>Tags</SectionTitle>
      <div>
        <div className="flex flex-wrap gap-2 mb-2">
          {globalTags.map(tag => (
            <button key={tag} type="button" onClick={() => toggleTag(tag)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                state.selectedTags.includes(tag)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              {tag}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input value={newTag} onChange={e => setNewTag(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNewTag() } }}
            placeholder="New tag…" className={`${inputCls} flex-1`} />
          <button type="button" onClick={addNewTag} disabled={!newTag.trim()}
            className="text-sm px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40">
            Add
          </button>
        </div>
      </div>

      {/* Section: Notes */}
      <SectionTitle>Notes</SectionTitle>
      <Field label="Availability Note" hint="e.g. Exam prep until June — will resume in July">
        <textarea value={state.availabilityNote} onChange={e => state.setAvailabilityNote(e.target.value)}
          placeholder="Optional" rows={2} className={inputCls} />
      </Field>
      <Field label="腾讯文档链接" hint="该学生家长群的共享文档地址，用于生成报告后快速跳转">
        <input value={state.tencentDocUrl} onChange={e => state.setTencentDocUrl(e.target.value)}
          placeholder="https://docs.qq.com/doc/…" className={inputCls} />
      </Field>
      <Field label="Private Notes" hint="Never exported or shared">
        <textarea value={state.privateNotes} onChange={e => state.setPrivateNotes(e.target.value)}
          placeholder="Optional" rows={3} className={inputCls} />
      </Field>
    </>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {hint && <p className="text-xs text-gray-400">{hint}</p>}
      {children}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider pt-1 border-t border-gray-100">{children}</p>
}
