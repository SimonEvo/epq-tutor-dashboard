/**
 * Data service — all reads/writes to the data repo go through here.
 * Swap this file's implementation to migrate from GitHub API to any backend.
 */
import { getClient } from './githubClient'
import { GITHUB_CONFIG } from '@/config'
import type { Student, TagsConfig } from '@/types'

const { owner, dataRepo } = GITHUB_CONFIG

// ─── Internal helpers ────────────────────────────────────────────────────────

async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const client = getClient()
  const response = await client.repos.getContent({ owner, repo: dataRepo, path })
  const data = response.data as { content: string; sha: string }
  const content = atob(data.content.replace(/\n/g, ''))
  return { content, sha: data.sha }
}

async function putFile(path: string, content: string, sha?: string, message?: string) {
  const client = getClient()
  const encoded = btoa(unescape(encodeURIComponent(content)))
  await client.repos.createOrUpdateFileContents({
    owner,
    repo: dataRepo,
    path,
    message: message ?? `update ${path}`,
    content: encoded,
    ...(sha ? { sha } : {}),
  })
}

// ─── Students ────────────────────────────────────────────────────────────────

export async function listStudents(): Promise<Student[]> {
  const client = getClient()
  try {
    const response = await client.repos.getContent({ owner, repo: dataRepo, path: 'students' })
    const files = response.data as Array<{ name: string; type: string }>
    const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'))

    const students = await Promise.all(
      jsonFiles.map(async (f) => {
        const { content } = await getFile(`students/${f.name}`)
        return JSON.parse(content) as Student
      })
    )
    return students.sort((a, b) => a.name.localeCompare(b.name))
  } catch (e: unknown) {
    if ((e as { status?: number }).status === 404) return []
    throw e
  }
}

export async function getStudent(id: string): Promise<Student> {
  const { content } = await getFile(`students/${id}.json`)
  return JSON.parse(content) as Student
}

export async function saveStudent(student: Student): Promise<void> {
  const path = `students/${student.id}.json`
  let sha: string | undefined
  try {
    const existing = await getFile(path)
    sha = existing.sha
  } catch {
    // new file — no sha needed
  }
  student.updatedAt = new Date().toISOString()
  await putFile(path, JSON.stringify(student, null, 2), sha, `update student ${student.name}`)
}

export async function deleteStudent(id: string): Promise<void> {
  const client = getClient()
  const { sha } = await getFile(`students/${id}.json`)
  await client.repos.deleteFile({
    owner,
    repo: dataRepo,
    path: `students/${id}.json`,
    message: `delete student ${id}`,
    sha,
  })
}

// ─── Tags ────────────────────────────────────────────────────────────────────

export async function getTags(): Promise<string[]> {
  try {
    const { content } = await getFile('config/tags.json')
    const config = JSON.parse(content) as TagsConfig
    return config.tags
  } catch {
    return []
  }
}

export async function saveTags(tags: string[]): Promise<void> {
  let sha: string | undefined
  try {
    const existing = await getFile('config/tags.json')
    sha = existing.sha
  } catch {
    // first time
  }
  await putFile('config/tags.json', JSON.stringify({ tags }, null, 2), sha, 'update tags')
}

// ─── Auth check ──────────────────────────────────────────────────────────────

export async function verifyAuth(): Promise<boolean> {
  try {
    const client = getClient()
    await client.repos.get({ owner, repo: dataRepo })
    return true
  } catch {
    return false
  }
}
