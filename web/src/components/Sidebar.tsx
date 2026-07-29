import { BookOpen, FileText, FolderKanban, Moon, PanelLeft, Pencil, Plus, Sun, Trash2, Upload } from 'lucide-react'
import type { ChangeEvent } from 'react'
import type { Session } from '../types'

interface SidebarProps {
  sessions: Session[]
  activeId: string
  onSelect: (id: string) => void
  onNew: () => void
  onUpload: (file: File) => void
  uploadState: string
  knowledgeCount: number
  workspaceName: string
  workspaceSelected: boolean
  onTheme: () => void
  theme: 'light' | 'dark'
  onWorkspace: () => void
  onRename: (id: string) => void
  onDelete: (id: string) => void
}

function formatSessionTime(timestamp: number) {
  const value = new Date(timestamp)
  if (Number.isNaN(value.getTime())) return ''

  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const targetDay = new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime()
  const time = value.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })

  if (targetDay === today) return `今天 ${time}`
  if (today - targetDay === 86_400_000) return `昨天 ${time}`
  if (value.getFullYear() === now.getFullYear()) return `${value.getMonth() + 1} 月 ${value.getDate()} 日`
  return `${value.getFullYear()} 年 ${value.getMonth() + 1} 月 ${value.getDate()} 日`
}

export function Sidebar({ sessions, activeId, onSelect, onNew, onUpload, uploadState, knowledgeCount, workspaceName, workspaceSelected, onTheme, theme, onWorkspace, onRename, onDelete }: SidebarProps) {
  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) onUpload(file)
    event.target.value = ''
  }

  return (
    <aside className="left-sidebar" aria-label="会话与资料">
      <div className="sidebar-scroll">
        <button className="new-chat-button" type="button" onClick={onNew}>
          <Plus size={18} />
          新对话
        </button>

        <section className="sidebar-section">
          <h2>最近会话</h2>
          <div className="session-list">
            {sessions.map((session) => (
              <div
                key={session.id}
                className={`session-row ${session.id === activeId ? 'is-active' : ''}`}
              >
                <button type="button" className="session-main" onClick={() => onSelect(session.id)} aria-current={session.id === activeId ? 'page' : undefined}>
                  <span className="session-title">{session.title}</span>
                </button>
                <span className="session-meta">
                  <time dateTime={new Date(session.updatedAt).toISOString()}>{formatSessionTime(session.updatedAt)}</time>
                  <span className="session-actions">
                    <button type="button" title="重命名" aria-label="重命名会话" onClick={() => onRename(session.id)}><Pencil size={14} /></button>
                    <button type="button" title="删除" aria-label="删除会话" onClick={() => onDelete(session.id)}><Trash2 size={14} /></button>
                  </span>
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="sidebar-section resources-section">
          <h2>我的资料</h2>
          <div className="resource-row resource-status" aria-label="内置知识库状态">
            <BookOpen size={18} />
            <span><strong>内置知识库</strong><small>128 万条 · 已就绪</small></span>
          </div>
          <div className="resource-row resource-status">
            <FileText size={18} />
            <span><strong>上传的笔记</strong><small>{uploadState || `${knowledgeCount} 个 Markdown`}</small></span>
          </div>
          <div className="resource-row resource-status">
            <FolderKanban size={18} />
            <span><strong>任务工作区</strong><small title={workspaceSelected ? workspaceName : undefined}>{workspaceSelected ? workspaceName : '未选择文件夹'}</small></span>
          </div>
        </section>

        <label className="upload-box">
          <Upload size={19} />
          <strong>上传 Markdown 笔记</strong>
          <small>拖拽或点击选择文件</small>
          <input type="file" accept=".md,text/markdown" onChange={handleFile} />
        </label>
      </div>

      <div className="sidebar-tools" aria-label="侧栏工具">
        <button type="button" onClick={onTheme} title={theme === 'dark' ? '切换为亮色模式' : '切换为深色模式'} aria-label={theme === 'dark' ? '切换为亮色模式' : '切换为深色模式'}>{theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button type="button" onClick={onWorkspace} title="侧栏与工作区" aria-label="打开侧栏与工作区"><PanelLeft size={17} /></button>
      </div>
    </aside>
  )
}
