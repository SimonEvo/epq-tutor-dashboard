import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, saveSettings, AI_PROVIDERS } from '@/lib/settings'
import { publishCalendar, gistUrl } from '@/lib/calendarService'
import { getCalendarGistId } from '@/lib/dataService'
import { useStudentStore } from '@/stores/studentStore'

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings)
  const [saved, setSaved] = useState(false)
  const [calSyncing, setCalSyncing] = useState(false)
  const [calStatus, setCalStatus] = useState<'idle' | 'ok' | 'err'>('idle')
  const [calError, setCalError] = useState('')
  const students = useStudentStore(s => s.students)
  const calendarUrlFromStore = useStudentStore(s => s.calendarUrl)
  const [calendarUrl, setCalendarUrl] = useState<string | null>(calendarUrlFromStore)

  // On mount, try to load the existing Gist ID from the data repo so we can
  // show the subscribe URL even before the first manual sync.
  useEffect(() => {
    if (calendarUrl) return
    getCalendarGistId().then(id => {
      if (id) setCalendarUrl(gistUrl(id))
    }).catch(() => {/* ignore */})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Keep in sync if a background save updated the store URL.
  useEffect(() => {
    if (calendarUrlFromStore) setCalendarUrl(calendarUrlFromStore)
  }, [calendarUrlFromStore])

  const handleSyncCalendar = async () => {
    setCalSyncing(true)
    setCalStatus('idle')
    setCalError('')
    try {
      const url = await publishCalendar(students)
      setCalendarUrl(url)
      setCalStatus('ok')
    } catch (e) {
      setCalStatus('err')
      setCalError(e instanceof Error ? e.message : String(e))
    } finally {
      setCalSyncing(false)
    }
  }

  const handleCopyUrl = () => {
    if (calendarUrl) navigator.clipboard.writeText(calendarUrl)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    saveSettings(settings)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/" className="text-gray-400 hover:text-gray-600 text-sm">← Dashboard</Link>
        <span className="text-gray-300">/</span>
        <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-5">

        {/* iCloud Calendar */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">iCloud 日历同步</h2>
          <p className="text-xs text-gray-400 mb-4">
            每次保存 Session 后会自动更新日历。日历以私密 Gist 托管，URL 含随机 ID，不可被搜索或猜测。
          </p>

          {/* Subscription URL */}
          {calendarUrl ? (
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-gray-700 truncate select-all">
                {calendarUrl}
              </code>
              <button
                type="button"
                onClick={handleCopyUrl}
                className="shrink-0 text-xs px-3 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
              >
                复制
              </button>
            </div>
          ) : (
            <div className="mb-4 text-xs text-gray-400 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
              点击「立即同步日历」生成订阅链接（首次创建 Gist）
            </div>
          )}

          {/* How to subscribe */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <p className="text-xs font-medium text-gray-700 mb-2">如何订阅（一次性操作）</p>
            <ol className="text-xs text-gray-500 space-y-1 list-decimal list-inside">
              <li>在 Mac 上打开「日历」app</li>
              <li>菜单栏 → 文件 → 新建日历订阅…</li>
              <li>粘贴上方 URL，点击「订阅」</li>
              <li>设置日历名称和自动刷新频率（建议每小时）</li>
            </ol>
          </div>

          {/* Manual sync */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={handleSyncCalendar}
              disabled={calSyncing || students.length === 0}
              className="text-sm px-4 py-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 disabled:opacity-40 transition-colors"
            >
              {calSyncing ? '同步中…' : '立即同步日历'}
            </button>
            {calStatus === 'ok' && (
              <span className="text-xs text-green-600">同步成功 ✓</span>
            )}
            {calStatus === 'err' && (
              <span className="text-xs text-red-500">同步失败：{calError || '未知错误'}</span>
            )}
            {students.length === 0 && calStatus === 'idle' && (
              <span className="text-xs text-gray-400">请先从 Dashboard 加载学生数据</span>
            )}
          </div>
        </section>

        {/* AI Model */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">AI 模型配置</h2>
          <p className="text-xs text-gray-400 mb-4">
            支持任何 OpenAI 兼容接口。选择预设厂商或手动填写 Base URL 和模型名称。
          </p>

          {/* Provider presets */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {AI_PROVIDERS.map(p => (
              <button
                key={p.label}
                type="button"
                onClick={() => setSettings(s => ({ ...s, aiBaseUrl: p.baseUrl, aiModel: p.model }))}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                  settings.aiBaseUrl === p.baseUrl
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">API Key</label>
              <input
                type="password"
                value={settings.aiApiKey}
                onChange={e => setSettings(s => ({ ...s, aiApiKey: e.target.value }))}
                placeholder="sk-…"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">Base URL</label>
              <input
                type="text"
                value={settings.aiBaseUrl}
                onChange={e => setSettings(s => ({ ...s, aiBaseUrl: e.target.value }))}
                placeholder="https://api.openai.com/v1"
                className={inputCls}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-gray-700">模型名称</label>
              <input
                type="text"
                value={settings.aiModel}
                onChange={e => setSettings(s => ({ ...s, aiModel: e.target.value }))}
                placeholder="gpt-4o / qwen-plus / deepseek-chat …"
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Tencent Docs (future) */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6 opacity-60">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="text-sm font-semibold text-gray-900">腾讯文档 API</h2>
            <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">即将支持</span>
          </div>
          <p className="text-xs text-gray-400">
            配置后可一键将报告推送至各学生腾讯文档，无需手动复制粘贴。
            需要在腾讯文档开放平台注册应用（企业账号），详见文档。
          </p>
        </section>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-indigo-600 text-white text-sm px-5 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {saved ? '已保存 ✓' : 'Save Settings'}
          </button>
          <Link to="/" className="text-sm px-5 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500'
