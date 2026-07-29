import { Database, FileText, RefreshCw, Trash2, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { apiFetch } from '../api/client'
import { Dialog } from '../components/Dialog'
import type { KnowledgeFile } from '../types'

interface KnowledgeViewProps {
  username: string
  onLogin: () => void
  onNotice: (message: string) => void
  onClose: () => void
  onChanged: (files: KnowledgeFile[]) => void
}

const formatSize = (size: number) => size < 1024
  ? `${size} B`
  : `${Math.max(1, Math.round(size / 1024))} KB`

const formatDate = (value: string) => {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function KnowledgeView({ username, onLogin, onNotice, onClose, onChanged }: KnowledgeViewProps) {
  const [files, setFiles] = useState<KnowledgeFile[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [pendingDelete, setPendingDelete] = useState<KnowledgeFile | null>(null)
  const uploadRef = useRef<HTMLInputElement>(null)

  const load = async () => {
    if (!username) return
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch<{ files: KnowledgeFile[] }>(`/api/knowledge/files/${encodeURIComponent(username)}`)
      setFiles(result.files)
      onChanged(result.files)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '读取知识库目录失败')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [username])

  const upload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!file.name.toLowerCase().endsWith('.md')) { setError('知识库仅支持 Markdown 文件'); return }
    const form = new FormData()
    form.append('file', file)
    form.append('username', username)
    setLoading(true)
    setError('')
    try {
      const result = await apiFetch<{ chunks: number }>('/api/upload', { method: 'POST', body: form })
      onNotice(`${file.name} 已加入知识库，共 ${result.chunks} 个知识片段`)
      await load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '上传失败')
    } finally {
      setLoading(false)
    }
  }

  const remove = async () => {
    if (!pendingDelete) return
    const target = pendingDelete
    setPendingDelete(null)
    setLoading(true)
    try {
      await apiFetch(`/api/knowledge/files/${encodeURIComponent(username)}/${encodeURIComponent(target.stored_name)}`, { method: 'DELETE' })
      onNotice(`${target.name} 已从知识库移除`)
      await load()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '删除失败')
    } finally {
      setLoading(false)
    }
  }

  if (!username) return <section className="route-view login-required"><button className="route-close login-close" type="button" onClick={onClose} aria-label="关闭知识库管理"><X size={18} /></button><Database size={30} /><h1>知识库管理</h1><p>登录后可查看和管理补充知识文件。</p><button onClick={onLogin}>登录后继续</button></section>

  return <section className="route-view knowledge-view" id="main-content">
    <header className="route-view-head">
      <div><h1>知识库管理</h1><p>管理已上传并参与检索的 Markdown 文件</p></div>
      <div className="route-actions">
        <button type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} />刷新</button>
        <button type="button" onClick={() => uploadRef.current?.click()} disabled={loading}><Upload size={16} />上传 Markdown</button>
        <input ref={uploadRef} type="file" accept=".md,text/markdown" hidden onChange={upload} />
        <button className="route-close" type="button" onClick={onClose} aria-label="关闭知识库管理" title="关闭"><X size={18} /></button>
      </div>
    </header>
    <div className="knowledge-page-content">
      <div className="knowledge-summary"><span className="knowledge-summary-icon"><Database size={20} /></span><div><strong>{files.length} 个补充文件</strong><small>{files.reduce((total, file) => total + file.chunks, 0)} 个知识片段正在参与检索</small></div></div>
      {error && <p className="route-error" role="alert">{error}</p>}
      <section className="knowledge-file-list" aria-label="知识库文件">
        {files.map((file) => <article className="knowledge-file-row" key={file.stored_name}>
          <span className="knowledge-file-icon"><FileText size={18} /></span>
          <div><strong title={file.name}>{file.name}</strong><small>{formatSize(file.size)} · {file.chunks} 个片段 · {formatDate(file.updated_at)}</small></div>
          <button className="danger-icon" type="button" onClick={() => setPendingDelete(file)} aria-label={`删除 ${file.name}`} title="删除"><Trash2 size={16} /></button>
        </article>)}
        {!files.length && !loading && <div className="knowledge-empty"><Database size={28} /><strong>还没有补充知识文件</strong><p>上传 Markdown 后，AI 会在需要时检索其中内容。</p></div>}
        {loading && !files.length && <div className="knowledge-empty"><span className="answer-loading-dot" /><p>正在读取知识库目录...</p></div>}
      </section>
    </div>
    <Dialog open={!!pendingDelete} title="删除知识文件" onClose={() => setPendingDelete(null)} footer={<><button onClick={() => setPendingDelete(null)}>取消</button><button className="dialog-danger" onClick={() => void remove()}>确认删除</button></>}>
      删除“{pendingDelete?.name}”后，它将不再参与知识库检索。
    </Dialog>
  </section>
}
