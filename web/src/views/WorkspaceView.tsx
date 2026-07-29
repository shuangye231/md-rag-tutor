import { ChevronDown, ChevronRight, Code2, Eye, File, FilePlus2, Folder, FolderOpen, PanelLeftClose, PanelLeftOpen, Pencil, RefreshCw, Save, Sparkles, Upload, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { apiFetch, jsonBody } from '../api/client'
import type { Message } from '../types'
import { Dialog } from '../components/Dialog'

interface WorkspaceFile { name: string; path: string; size: number; updated_at: string }
interface WorkspaceData { root_name: string; selected: boolean; folders: string[]; files: WorkspaceFile[] }
interface WorkspaceTreeNode { name: string; path: string; folders: WorkspaceTreeNode[]; files: WorkspaceFile[] }

function buildWorkspaceTree(data: WorkspaceData): WorkspaceTreeNode[] {
  const root: WorkspaceTreeNode = { name: '', path: '', folders: [], files: [] }
  const ensureFolder = (path: string) => path.split('/').filter(Boolean).reduce((parent, name) => {
    const childPath = parent.path ? `${parent.path}/${name}` : name
    let child = parent.folders.find((item) => item.path === childPath)
    if (!child) { child = { name, path: childPath, folders: [], files: [] }; parent.folders.push(child) }
    return child
  }, root)
  data.folders.forEach(ensureFolder)
  data.files.forEach((file) => {
    const parts = file.path.split('/')
    const parent = parts.length > 1 ? ensureFolder(parts.slice(0, -1).join('/')) : root
    parent.files.push(file)
  })
  const sort = (node: WorkspaceTreeNode) => {
    node.folders.sort((a, b) => a.name === b.name ? 0 : a.name < b.name ? -1 : 1).forEach(sort)
    node.files.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN', { numeric: true }))
  }
  sort(root)
  return root.folders
}

function WorkspaceTree({ nodes, files = [], expanded, activePath, onToggle, onOpen }: {
  nodes: WorkspaceTreeNode[]
  files?: WorkspaceFile[]
  expanded: Set<string>
  activePath: string
  onToggle: (path: string) => void
  onOpen: (path: string) => void
}) {
  return <>
    {nodes.map((node) => {
      const open = expanded.has(node.path)
      return <div className="workspace-tree-group" key={node.path}>
        <button className="workspace-tree-folder" type="button" onClick={() => onToggle(node.path)} aria-expanded={open}>
          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          {open ? <FolderOpen size={15} /> : <Folder size={15} />}
          <span title={node.name}>{node.name}</span>
        </button>
        {open && <div className="workspace-tree-children"><WorkspaceTree nodes={node.folders} files={node.files} expanded={expanded} activePath={activePath} onToggle={onToggle} onOpen={onOpen} /></div>}
      </div>
    })}
    {files.map((file) => <button className={`workspace-tree-file ${activePath === file.path ? 'is-active' : ''}`} type="button" key={file.path} onClick={() => onOpen(file.path)}>
      <File size={14} />
      <span title={file.name}>{file.name}</span>
      <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
    </button>)}
  </>
}

interface WorkspaceViewProps {
  username: string
  sessionTitle: string
  messages: Message[]
  onLogin: () => void
  onNotice: (message: string) => void
  onClose: () => void
  onWorkspaceChange: (summary: { rootName: string; selected: boolean }) => void
}

export function WorkspaceView({ username, sessionTitle, messages, onLogin, onNotice, onClose, onWorkspaceChange }: WorkspaceViewProps) {
  const [data, setData] = useState<WorkspaceData>({ root_name: '任务工作区', selected: false, folders: [], files: [] })
  const [activePath, setActivePath] = useState('')
  const [content, setContent] = useState('')
  const [instruction, setInstruction] = useState('整理为一份结构清晰的学习笔记')
  const [busy, setBusy] = useState(false)
  const [preview, setPreview] = useState(false)
  const [error, setError] = useState('')
  const [folderDialog, setFolderDialog] = useState(false)
  const [folderName, setFolderName] = useState('')
  const [filesOpen, setFilesOpen] = useState(true)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const uploadRef = useRef<HTMLInputElement>(null)

  const loadFiles = async () => {
    if (!username) return
    setError('')
    try {
      const next = await apiFetch<WorkspaceData>(`/api/workspace/${encodeURIComponent(username)}`)
      setData(next)
      onWorkspaceChange({ rootName: next.root_name, selected: next.selected })
      setExpandedFolders((current) => current.size ? current : new Set(next.folders.filter((folder) => !folder.includes('/'))))
    }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : '读取工作区失败') }
  }

  useEffect(() => { void loadFiles() }, [username])

  const openFile = async (path: string) => {
    setBusy(true); setError('')
    try {
      const file = await apiFetch<{ path: string; content: string }>(`/api/workspace/${encodeURIComponent(username)}/${path.split('/').map(encodeURIComponent).join('/')}`)
      setActivePath(file.path); setContent(file.content)
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '读取文件失败') }
    finally { setBusy(false) }
  }

  const save = async () => {
    if (!activePath) { setError('请先选择一个文件'); return }
    setBusy(true)
    try { await apiFetch('/api/workspace/save', jsonBody({ username, filename: activePath, content })); onNotice('文件已保存'); await loadFiles() }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : '保存失败') }
    finally { setBusy(false) }
  }

  const createFolder = async () => {
    const folder = folderName.trim()
    if (!folder) return
    try { await apiFetch('/api/workspace/folders', jsonBody({ username, folder })); setFolderDialog(false); setFolderName(''); onNotice('文件夹已创建'); await loadFiles() }
    catch (requestError) { setError(requestError instanceof Error ? requestError.message : '创建失败') }
  }

  const upload = async (file: File) => {
    const form = new FormData(); form.append('file', file)
    setBusy(true)
    try {
      const result = await apiFetch<{ file: WorkspaceFile; content: string }>(`/api/workspace/upload?username=${encodeURIComponent(username)}&folder=`, { method: 'POST', body: form })
      setActivePath(result.file.path); setContent(result.content); onNotice('文件已上传'); await loadFiles()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '上传失败') }
    finally { setBusy(false) }
  }

  const generate = async () => {
    if (!activePath) { setError('请先选择一个工作区文件'); return }
    setBusy(true)
    try {
      const result = await apiFetch<{ file: WorkspaceFile; content: string }>('/api/workspace/generate', jsonBody({ username, filename: activePath, instruction }))
      setActivePath(result.file.path); setContent(result.content); onNotice('AI 文档已生成'); await loadFiles()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '生成失败') }
    finally { setBusy(false) }
  }

  const exportSession = async () => {
    try {
      const result = await apiFetch<{ file: WorkspaceFile }>('/api/workspace/session-export', jsonBody({ username, title: sessionTitle, messages, folder: '' }))
      onNotice(`会话已保存为 ${result.file.name}`); await loadFiles()
    } catch (requestError) { setError(requestError instanceof Error ? requestError.message : '保存会话失败') }
  }

  if (!username) return <section className="route-view login-required"><button className="route-close login-close" type="button" onClick={onClose} aria-label="关闭任务工作区"><X size={18} /></button><h1>任务工作区</h1><p>登录后可在本机管理 Markdown 学习文件。</p><button onClick={onLogin}>登录后继续</button></section>

  const tree = buildWorkspaceTree(data)
  const rootFiles = data.files.filter((file) => !file.path.includes('/'))
  const toggleFolder = (path: string) => setExpandedFolders((current) => {
    const next = new Set(current)
    if (next.has(path)) next.delete(path); else next.add(path)
    return next
  })

  return (
    <section className="route-view workspace-view" id="main-content">
      <header className="route-view-head">
        <div><h1>任务工作区</h1><p>{data.root_name} · 编辑、生成与保存 Markdown</p></div>
        <div className="route-actions">
          <button onClick={() => uploadRef.current?.click()}><Upload size={16} />上传</button>
          <input ref={uploadRef} type="file" accept=".md,.txt,text/plain,text/markdown" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); event.target.value = '' }} />
          <button onClick={() => setFolderDialog(true)}><FilePlus2 size={16} />新建文件夹</button>
          <button onClick={async () => { try { await apiFetch('/api/workspace/open-folder', jsonBody({ username })); await loadFiles() } catch (e) { setError(e instanceof Error ? e.message : '选择失败') } }}><FolderOpen size={16} />选择本机文件夹</button>
          <button onClick={async () => { try { await apiFetch('/api/workspace/open-vscode', jsonBody({ username })); onNotice('已打开 VS Code') } catch (e) { setError(e instanceof Error ? e.message : '打开失败') } }}><Code2 size={16} />VS Code</button>
          <button className="route-close" type="button" onClick={onClose} aria-label="关闭任务工作区" title="关闭"><X size={18} /></button>
        </div>
      </header>
      <div className={`workspace-body-grid ${filesOpen ? '' : 'is-files-collapsed'}`}>
        {filesOpen ? <aside className="workspace-files-panel">
          <div className="panel-heading"><strong>文件</strong><span><button onClick={loadFiles} aria-label="刷新目录" title="刷新目录"><RefreshCw size={15} /></button><button onClick={() => setFilesOpen(false)} aria-label="收起目录" title="收起目录"><PanelLeftClose size={16} /></button></span></div>
          <div className="workspace-tree-scroll">
            <WorkspaceTree nodes={tree} files={rootFiles} expanded={expandedFolders} activePath={activePath} onToggle={toggleFolder} onOpen={(path) => void openFile(path)} />
            {!data.files.length && <p className="muted-empty">暂无文件，请上传 Markdown。</p>}
          </div>
          <button className="session-export" onClick={exportSession}>保存当前会话到工作区</button>
        </aside> : <aside className="workspace-files-rail"><button type="button" onClick={() => setFilesOpen(true)} aria-label="展开目录" title="展开目录"><PanelLeftOpen size={17} /></button></aside>}
        <main className="workspace-editor-panel">
          <div className="editor-toolbar"><strong>{activePath || '选择一个文件开始编辑'}</strong><span><button onClick={() => setPreview((value) => !value)} disabled={!activePath}>{preview ? <Pencil size={16} /> : <Eye size={16} />}{preview ? '编辑' : '预览'}</button><button onClick={save} disabled={!activePath || busy}><Save size={16} />保存</button></span></div>
          {preview ? <article className="workspace-preview"><ReactMarkdown>{content}</ReactMarkdown></article> : <textarea value={content} onChange={(event) => setContent(event.target.value)} disabled={!activePath || busy} aria-label="Markdown 编辑器" placeholder="选择或上传文件后在这里编辑..." />}
          <div className="generate-bar"><input value={instruction} onChange={(event) => setInstruction(event.target.value)} aria-label="AI 生成要求" /><button onClick={generate} disabled={!activePath || busy}><Sparkles size={16} />{busy ? '处理中' : 'AI 生成'}</button></div>
          {error && <p className="route-error" role="alert">{error}</p>}
        </main>
      </div>
      <Dialog open={folderDialog} title="新建文件夹" onClose={() => setFolderDialog(false)} footer={<><button onClick={() => setFolderDialog(false)}>取消</button><button className="dialog-primary" onClick={createFolder} disabled={!folderName.trim()}>创建</button></>}>
        <label className="dialog-field">文件夹名称<input value={folderName} onChange={(event) => setFolderName(event.target.value)} placeholder="例如：RAG 学习资料" /></label>
      </Dialog>
    </section>
  )
}
