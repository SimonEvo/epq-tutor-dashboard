import { Octokit } from '@octokit/rest'
import { PAT_STORAGE_KEY } from '@/config'

let _client: Octokit | null = null

export function getClient(): Octokit {
  const pat = localStorage.getItem(PAT_STORAGE_KEY)
  if (!pat) throw new Error('Not authenticated')
  if (!_client) {
    _client = new Octokit({ auth: pat })
  }
  return _client
}

export function resetClient() {
  _client = null
}
