const KEY = 'epq_app_settings'

export interface AppSettings {
  wecomWebhookUrl: string
  claudeApiKey: string
}

const DEFAULTS: AppSettings = { wecomWebhookUrl: '', claudeApiKey: '' }

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
