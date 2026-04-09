/**
 * Data service — all reads/writes to the data repo go through here.
 * Swap this file's implementation to migrate from GitHub API to any backend.
 */
import { getClient } from './githubClient'
import { GITHUB_CONFIG } from '@/config'
import type { Student, Supervisor, TagsConfig } from '@/types'

const { owner, dataRepo } = GITHUB_CONFIG

// ─── Internal helpers ────────────────────────────────────────────────────────

function base64Decode(b64: string): string {
  const binary = atob(b64.replace(/\n/g, ''))
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

function base64Encode(str: string): string {
  const bytes = new TextEncoder().encode(str)
  const binary = Array.from(bytes, b => String.fromCharCode(b)).join('')
  return btoa(binary)
}

async function getFile(path: string): Promise<{ content: string; sha: string }> {
  const client = getClient()
  const response = await client.repos.getContent({ owner, repo: dataRepo, path })
  const data = response.data as { content: string; sha: string }
  const content = base64Decode(data.content)
  return { content, sha: data.sha }
}

async function putFile(path: string, content: string, sha?: string, message?: string) {
  const client = getClient()
  const encoded = base64Encode(content)
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

// ─── Rounds ──────────────────────────────────────────────────────────────────

export async function getRounds(): Promise<string[]> {
  try {
    const { content } = await getFile('config/rounds.json')
    return JSON.parse(content) as string[]
  } catch {
    return []
  }
}

export async function saveRounds(rounds: string[]): Promise<void> {
  let sha: string | undefined
  try {
    const existing = await getFile('config/rounds.json')
    sha = existing.sha
  } catch { /* first time */ }
  await putFile('config/rounds.json', JSON.stringify(rounds, null, 2), sha, 'update rounds')
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

// ─── Supervisors ─────────────────────────────────────────────────────────────

export async function listSupervisors(): Promise<Supervisor[]> {
  const client = getClient()
  try {
    const response = await client.repos.getContent({ owner, repo: dataRepo, path: 'supervisors' })
    const files = response.data as Array<{ name: string; type: string }>
    const jsonFiles = files.filter(f => f.type === 'file' && f.name.endsWith('.json'))
    const supervisors = await Promise.all(
      jsonFiles.map(async (f) => {
        const { content } = await getFile(`supervisors/${f.name}`)
        return JSON.parse(content) as Supervisor
      })
    )
    return supervisors.sort((a, b) => a.name.localeCompare(b.name))
  } catch (e: unknown) {
    if ((e as { status?: number }).status === 404) return []
    throw e
  }
}

export async function saveSupervisor(supervisor: Supervisor): Promise<void> {
  const path = `supervisors/${supervisor.id}.json`
  let sha: string | undefined
  try {
    const existing = await getFile(path)
    sha = existing.sha
  } catch { /* new file */ }
  await putFile(path, JSON.stringify(supervisor, null, 2), sha, `update supervisor ${supervisor.name}`)
}

export async function deleteSupervisor(id: string): Promise<void> {
  const client = getClient()
  const { sha } = await getFile(`supervisors/${id}.json`)
  await client.repos.deleteFile({
    owner,
    repo: dataRepo,
    path: `supervisors/${id}.json`,
    message: `delete supervisor ${id}`,
    sha,
  })
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
