import { useState } from 'react'
import { Link } from 'react-router-dom'
import { getSettings, saveSettings } from '@/lib/settings'

export default function SettingsPage() {
  const [settings, setSettings] = useState(getSettings)
  const [saved, setSaved] = useState(false)

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

        {/* Claude API */}
        <section className="bg-white rounded-2xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-900 mb-1">AI 报告生成（通义千问）</h2>
          <p className="text-xs text-gray-400 mb-4">
            使用阿里云百炼平台。前往{' '}
            <span className="font-mono">bailian.console.aliyun.com</span>{' '}
            开通模型并获取 API Key。
          </p>
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
              <label className="text-sm font-medium text-gray-700">模型</label>
              <select
                value={settings.aiModel}
                onChange={e => setSettings(s => ({ ...s, aiModel: e.target.value }))}
                className={inputCls}
              >
                <option value="qwen3.5-flash">Qwen 3.5 Flash（免费，速度快）</option>
                <option value="qwen3.5-plus">Qwen 3.5 Plus（更强，按量计费）</option>
              </select>
              <p className="text-xs text-gray-400">Flash 日常使用完全够用；Plus 适合需要更长、更精细报告的场合。</p>
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
