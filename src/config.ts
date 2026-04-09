export const GITHUB_CONFIG = {
  owner: 'SimonEvo',
  dataRepo: 'epq-tutor-data',
} as const

export const PAT_STORAGE_KEY = 'epq_tutor_pat'

export const EPQ_MILESTONES = [
  { id: 'questionnaire', label: '问卷', optional: true },
  { id: 'intro', label: 'Intro', optional: false },
  { id: 'lit_review', label: '文综', optional: false },
  { id: 'methodology', label: '方法论', optional: false },
  { id: 'results', label: '结果', optional: false },
  { id: 'discussion', label: '讨论', optional: false },
  { id: 'reflection', label: '反思', optional: false },
  { id: 'conclusion', label: '结语', optional: false },
  { id: 'bibliography', label: '文献', optional: false },
  { id: 'abstract', label: '摘要', optional: false },
  { id: 'table1', label: '表1', optional: false },
  { id: 'table2', label: '表2', optional: false },
  { id: 'table4', label: '表4', optional: false },
  { id: 'table5', label: '表5', optional: false },
  { id: 'table6', label: '表6', optional: false },
  { id: 'table7', label: '表7', optional: false },
  { id: 'table11', label: '表11', optional: false },
  { id: 'defense', label: '答辩', optional: false },
  { id: 'submission', label: '提交', optional: false },
] as const

export type MilestoneId = typeof EPQ_MILESTONES[number]['id']
