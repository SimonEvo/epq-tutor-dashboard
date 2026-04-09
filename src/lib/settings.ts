const KEY = 'epq_app_settings'

export interface AppSettings {
  wecomWebhookUrl: string
  aiApiKey: string
  aiModel: string
}

const DEFAULTS: AppSettings = { wecomWebhookUrl: '', aiApiKey: '', aiModel: 'qwen3.5-flash' }

export function getSettings(): AppSettings {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveSettings(s: AppSettings): void {
  localStorage.setItem(KEY, JSON.stringify(s))
}
