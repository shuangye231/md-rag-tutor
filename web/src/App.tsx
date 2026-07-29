import { useEffect, useMemo, useRef, useState } from 'react'
import { apiFetch, jsonBody } from './api/client'
import { ChatPanel } from './components/ChatPanel'
import { Dialog } from './components/Dialog'
import { Header } from './components/Header'
import { LearningSidebar } from './components/LearningSidebar'
import { Sidebar } from './components/Sidebar'
import { defaultSessions } from './data'
import { useAuth } from './hooks/useAuth'
import type { AppMode, KnowledgeFile, Message, ModelOption, Session, SessionAttachment } from './types'
import { AdminView } from './views/AdminView'
import { LearningView } from './views/LearningView'
import { KnowledgeView } from './views/KnowledgeView'
import { WorkspaceView } from './views/WorkspaceView'

const MODEL_KEY = 'ai-tutor-web-model'
const USER_AVATARS = ['👤', '🙂', '😎', '🧑‍💻', '🧑‍🎓', '🌟', '🚀', '💡']
const AI_AVATARS = ['🤖', '🧠', '🧑‍🏫', '✨', '🔮', '🛰️', '📚', '🎓']
const userAvatarKey = (user: string) => `ai-tutor-user-avatar:${user || 'guest'}`
const readUserAvatar = (user: string) => localStorage.getItem(userAvatarKey(user)) || localStorage.getItem('userAvatar') || '👤'
const fallbackModels: ModelOption[] = [{ id: 'free', label: 'Free', current: true }, { id: 'flash', label: 'Flash' }, { id: 'pro', label: 'Pro' }]
const sessionKey = (user: string) => `ai-tutor-web-sessions-v2:${user || 'guest'}`
const readSessions = (user: string): Session[] => {
  try { const parsed = JSON.parse(localStorage.getItem(sessionKey(user)) || 'null'); return Array.isArray(parsed) && parsed.length ? parsed : defaultSessions }
  catch { return defaultSessions }
}
const makeMessage = (role: Message['role'], content: string): Message => ({ id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, content, createdAt: Date.now() })
const cleanMessages = (messages: Message[]) => messages.map(({ role, content }) => ({ role, content }))
const formatStat = (value: unknown) => new Intl.NumberFormat('zh-CN').format(Number(value) || 0)

type ConfirmState = { title: string; message: string; action: () => Promise<void> | void; label?: string } | null

export default function App() {
  const auth = useAuth()
  const [route, setRoute] = useState(() => location.pathname)
  const [sessions, setSessions] = useState<Session[]>(() => readSessions(auth.currentUser))
  const [sessionOwner, setSessionOwner] = useState(auth.currentUser)
  const [activeId, setActiveId] = useState(() => readSessions(auth.currentUser)[0]?.id || '')
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [uploadState, setUploadState] = useState('')
  const [knowledgeFiles, setKnowledgeFiles] = useState<KnowledgeFile[]>([])
  const [workspaceSummary, setWorkspaceSummary] = useState({ rootName: '', selected: false })
  const [attachmentsBySession, setAttachmentsBySession] = useState<Record<string, SessionAttachment[]>>({})
  const [attachmentBusy, setAttachmentBusy] = useState(false)
  const [models, setModels] = useState<ModelOption[]>(fallbackModels)
  const [selectedModel, setSelectedModel] = useState(() => localStorage.getItem(MODEL_KEY) || 'free')
  const [tutorMode, setTutorMode] = useState(() => localStorage.getItem('tutorMode') || 'explain')
  const [appMode, setAppMode] = useState<AppMode>(() => localStorage.getItem('chatMode') === 'task' ? 'task' : 'chat')
  const [userAvatar, setUserAvatar] = useState(() => readUserAvatar(auth.currentUser))
  const [aiAvatar, setAiAvatar] = useState(() => localStorage.getItem('aiAvatar') || '🤖')
  const [avatarOpen, setAvatarOpen] = useState<'user' | 'ai' | null>(null)
  const [authOpen, setAuthOpen] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [authForm, setAuthForm] = useState({ username: '', password: '' })
  const [authError, setAuthError] = useState('')
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordForm, setPasswordForm] = useState({ old: '', next: '' })
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  const [feedback, setFeedback] = useState('')
  const [statsOpen, setStatsOpen] = useState(false)
  const [stats, setStats] = useState<any>(null)
  const [renameId, setRenameId] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [confirmState, setConfirmState] = useState<ConfirmState>(null)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light')
  const askControllerRef = useRef<AbortController | null>(null)
  const askRequestRef = useRef(0)

  const activeSession = useMemo(() => sessions.find((session) => session.id === activeId) || sessions[0], [activeId, sessions])
  const activeAttachments = attachmentsBySession[activeSession?.id] || []
  const cancelAsk = (notify = false) => {
    if (!askControllerRef.current) return
    askRequestRef.current += 1
    askControllerRef.current.abort()
    askControllerRef.current = null
    setLoading(false)
    setError('')
    if (notify) setNotice('已停止生成')
  }
  const navigate = (path: string) => { cancelAsk(); history.pushState({}, '', path); setRoute(location.pathname) }

  const loadWorkspaceSummary = async (username: string) => {
    if (!username) { setWorkspaceSummary({ rootName: '', selected: false }); return }
    try {
      const result = await apiFetch<{ root_name: string; selected: boolean }>(`/api/workspace/${encodeURIComponent(username)}`)
      setWorkspaceSummary({ rootName: result.root_name, selected: result.selected })
    } catch { setWorkspaceSummary({ rootName: '', selected: false }) }
  }

  const loadKnowledgeFiles = async (username: string) => {
    if (!username) { setKnowledgeFiles([]); return }
    try {
      const result = await apiFetch<{ files: KnowledgeFile[] }>(`/api/knowledge/files/${encodeURIComponent(username)}`)
      setKnowledgeFiles(result.files)
    } catch { setKnowledgeFiles([]) }
  }

  useEffect(() => { const onPop = () => { cancelAsk(); setRoute(location.pathname) }; addEventListener('popstate', onPop); return () => removeEventListener('popstate', onPop) }, [])
  useEffect(() => () => { askRequestRef.current += 1; askControllerRef.current?.abort() }, [])
  useEffect(() => { localStorage.setItem(sessionKey(sessionOwner), JSON.stringify(sessions)) }, [sessions, sessionOwner])
  useEffect(() => {
    cancelAsk()
    const next = readSessions(auth.currentUser)
    setSessionOwner(auth.currentUser)
    setSessions(next)
    setActiveId(next[0]?.id || '')
    setUserAvatar(readUserAvatar(auth.currentUser))
    void loadWorkspaceSummary(auth.currentUser)
    void loadKnowledgeFiles(auth.currentUser)
  }, [auth.currentUser])
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 2800); return () => clearTimeout(timer) }, [notice])
  useEffect(() => {
    apiFetch<{ models: ModelOption[] }>('/api/models').then((data) => {
      const normalized = data.models.map((item) => ({ ...item, label: item.label || item.name || ({ free: 'Free', flash: 'Flash', pro: 'Pro' } as Record<string, string>)[item.id] || item.id }))
      setModels(normalized); const current = normalized.find((item) => item.current); if (current) setSelectedModel(current.id)
    }).catch(() => undefined)
  }, [])

  const updateMessages = (sessionId: string, updater: (messages: Message[]) => Message[]) => setSessions((current) => current.map((session) => session.id === sessionId ? { ...session, messages: updater(session.messages), updatedAt: Date.now() } : session))
  const createSession = () => { cancelAsk(); const id = `session-${Date.now()}`; setSessions((current) => [{ id, title: '新对话', messages: [], updatedAt: Date.now() }, ...current]); setActiveId(id); setInput(''); setError(''); if (route !== '/') navigate('/') }

  const sendMessage = async () => {
    const query = input.trim(); if (!query || loading || !activeSession) return
    if (appMode === 'task' && !workspaceSummary.selected) {
      setNotice('任务模式需要先选择任务工作区')
      if (auth.currentUser) navigate('/workspace'); else showLogin()
      return
    }
    const sessionId = activeSession.id
    updateMessages(sessionId, (current) => [...current, makeMessage('user', query)])
    setSessions((current) => current.map((session) => session.id === sessionId && session.title === '新对话' ? { ...session, title: query.length > 18 ? `${query.slice(0, 18)}…` : query } : session))
    setInput(''); setError(''); setLoading(true)
    const controller = new AbortController()
    const requestId = askRequestRef.current + 1
    askRequestRef.current = requestId
    askControllerRef.current = controller
    try {
      const data = await apiFetch<any>('/api/ask', { ...jsonBody({ query, session_id: sessionId, username: auth.currentUser || 'anonymous', tutor_mode: tutorMode, app_mode: appMode }), signal: controller.signal })
      if (controller.signal.aborted || askRequestRef.current !== requestId) return
      if (data.error) throw new Error(data.message || '模型暂时不可用')
      updateMessages(sessionId, (current) => [...current, makeMessage('assistant', data.answer || '暂时没有可显示的回答。')])
    } catch (requestError) {
      if (controller.signal.aborted || askRequestRef.current !== requestId || (requestError instanceof DOMException && requestError.name === 'AbortError')) return
      setError(requestError instanceof Error ? requestError.message : '连接失败，请检查服务后重试。')
    } finally {
      if (askRequestRef.current === requestId) { askControllerRef.current = null; setLoading(false) }
    }
  }

  const uploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.md')) { setUploadState('仅支持 Markdown 文件'); return }
    setUploadState(`正在处理 ${file.name}`); const form = new FormData(); form.append('file', file); form.append('username', auth.currentUser)
    try { const data = await apiFetch<any>('/api/upload', { method: 'POST', body: form }); setUploadState(`${file.name} · ${data.chunks || 0} 个知识片段`); setNotice('Markdown 笔记已加入补充知识库'); await loadKnowledgeFiles(auth.currentUser) }
    catch (e) { setUploadState(e instanceof Error ? e.message : '上传失败，请重试') }
  }
  const attachFile = async (file: File) => {
    if (!activeSession || attachmentBusy) return
    const sessionId = activeSession.id
    const form = new FormData()
    form.append('session_id', sessionId)
    form.append('file', file)
    setAttachmentBusy(true)
    try {
      const attachment = await apiFetch<SessionAttachment>('/api/session/attachment', { method: 'POST', body: form })
      setAttachmentsBySession((current) => ({ ...current, [sessionId]: [...(current[sessionId] || []), attachment] }))
      setNotice(`${attachment.name} 已加入当前会话`)
    } catch (e) {
      setNotice(e instanceof Error ? e.message : '附件读取失败')
    } finally {
      setAttachmentBusy(false)
    }
  }
  const removeAttachment = async (attachmentId: string) => {
    if (!activeSession) return
    const sessionId = activeSession.id
    setAttachmentsBySession((current) => ({ ...current, [sessionId]: (current[sessionId] || []).filter((item) => item.id !== attachmentId) }))
    try { await apiFetch(`/api/session/attachment/${encodeURIComponent(sessionId)}/${encodeURIComponent(attachmentId)}`, { method: 'DELETE' }) }
    catch { setNotice('附件移除失败，请重试') }
  }
  const changeModel = async (id: string) => {
    const previous = selectedModel; setSelectedModel(id)
    try { const data = await apiFetch<any>('/api/models/switch', jsonBody({ model_id: id, pro_api_key: '' })); localStorage.setItem(MODEL_KEY, data.current || id); setNotice(`已切换到 ${models.find((item) => item.id === id)?.label || id}`) }
    catch { setSelectedModel(previous); setNotice('模型切换失败，已恢复原模型') }
  }

  const submitAuth = async () => {
    setAuthError('')
    try {
      if (authMode === 'register') { await auth.register(authForm.username, authForm.password); setAuthMode('login'); setAuthError('注册成功，请使用新账号登录。'); return }
      await auth.login(authForm.username, authForm.password); setAuthOpen(false); setAuthForm({ username: '', password: '' }); setNotice('登录成功')
    } catch (e) { setAuthError(e instanceof Error ? e.message : '操作失败') }
  }
  const logout = () => { auth.logout(); setNotice('已退出登录'); if (route !== '/') navigate('/') }
  const showLogin = () => { setAuthMode('login'); setAuthError(''); setAuthOpen(true) }

  const renameSession = (id: string) => { const session = sessions.find((item) => item.id === id); if (!session) return; setRenameId(id); setRenameValue(session.title) }
  const saveRename = () => { if (renameValue.trim()) setSessions((current) => current.map((item) => item.id === renameId ? { ...item, title: renameValue.trim() } : item)); setRenameId('') }
  const deleteSession = (id: string) => setConfirmState({ title: '删除会话', message: '该会话及其本地消息将被永久删除。', action: () => { const next = sessions.filter((item) => item.id !== id); setSessions(next.length ? next : defaultSessions); if (id === activeId) setActiveId((next.length ? next : defaultSessions)[0].id) } })
  const clearSession = () => activeSession && setConfirmState({ title: '清空当前对话', message: '会话标题会保留，但全部消息和附件将被移除。', label: '确认清空', action: async () => { await apiFetch('/api/clear', jsonBody({ session_id: activeSession.id, username: auth.currentUser || 'anonymous' })); updateMessages(activeSession.id, () => []); setAttachmentsBySession((current) => ({ ...current, [activeSession.id]: [] })); setNotice('当前对话已清空') } })

  const exportMarkdown = () => {
    if (!activeSession?.messages.length) { setNotice('当前会话没有可导出的内容'); return }
    const markdown = `# ${activeSession.title}\n\n${activeSession.messages.map((item) => `${item.role === 'user' ? '## 我' : '## AI 导师'}\n\n${item.content}`).join('\n\n')}`
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `${activeSession.title}.md`; link.click(); URL.revokeObjectURL(url); setNotice('Markdown 已导出')
  }
  const exportPdf = () => {
    if (!activeSession?.messages.length) { setNotice('当前会话没有可导出的内容'); return }
    const popup = window.open('', '_blank'); if (!popup) { setNotice('浏览器拦截了打印窗口'); return }
    const escape = (value: string) => value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char] || char)).replace(/\n/g, '<br>')
    popup.document.write(`<title>${escape(activeSession.title)}</title><style>body{font:14px/1.8 "Microsoft YaHei",sans-serif;max-width:780px;margin:40px auto;color:#18212c}section{margin:20px 0;padding:16px;border:1px solid #e4e8ee;border-radius:8px}h3{color:#2563eb}</style><h1>${escape(activeSession.title)}</h1>${activeSession.messages.map((item) => `<section><h3>${item.role === 'user' ? '我' : 'AI 导师'}</h3><p>${escape(item.content)}</p></section>`).join('')}`); popup.document.close(); popup.focus(); setTimeout(() => popup.print(), 250)
  }
  const share = async () => {
    if (!activeSession?.messages.length) { setNotice('当前会话还没有可分享的内容'); return }
    try { const data = await apiFetch<any>('/api/share', jsonBody({ title: activeSession.title, messages: cleanMessages(activeSession.messages) })); const url = location.origin + data.share_path; await navigator.clipboard?.writeText(url); setNotice(navigator.clipboard ? '分享链接已复制' : url) }
    catch (e) { setNotice(e instanceof Error ? e.message : '分享失败') }
  }
  const loadStats = async () => {
    setStatsOpen(true)
    try {
      const [session, global, user] = await Promise.all([apiFetch<any>('/api/session/stats', jsonBody({ session_id: activeSession?.id })), apiFetch<any>('/api/stats/global'), auth.currentUser ? apiFetch<any>('/api/user/stats', jsonBody({ username: auth.currentUser })) : Promise.resolve(null)])
      setStats({ session, global, user })
    } catch (e) { setStats({ error: e instanceof Error ? e.message : '统计读取失败' }) }
  }
  const startVoice = (setText: (value: string) => void) => {
    const Recognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!Recognition) { setNotice('当前浏览器不支持语音输入'); return }
    const recognition = new Recognition(); recognition.lang = 'zh-CN'; recognition.interimResults = false
    recognition.onresult = (event: any) => setText(event.results[0][0].transcript)
    recognition.onerror = () => setNotice('语音识别未完成，请重试')
    recognition.start(); setNotice('正在聆听，请开始说话')
  }
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light'
    document.documentElement.dataset.theme = next
    localStorage.setItem('theme', next)
    setTheme(next)
    setNotice(next === 'dark' ? '已切换为深色模式' : '已切换为亮色模式')
  }
  const changeAppMode = (mode: AppMode) => {
    setAppMode(mode)
    localStorage.setItem('chatMode', mode)
    setNotice(mode === 'task' ? (workspaceSummary.selected ? `已切换到任务模式：${workspaceSummary.rootName}` : '已切换到任务模式，请选择工作区') : '已切换到聊天模式')
  }
  const openWorkspace = () => auth.currentUser ? navigate('/workspace') : showLogin()
  const chooseAvatar = (avatar: string) => {
    if (avatarOpen === 'user') {
      localStorage.setItem(userAvatarKey(auth.currentUser), avatar)
      localStorage.setItem('userAvatar', avatar)
      setUserAvatar(avatar)
    } else if (avatarOpen === 'ai') {
      localStorage.setItem('aiAvatar', avatar)
      setAiAvatar(avatar)
    }
    setAvatarOpen(null)
  }

  if (!activeSession) return null
  return <div className="app-root">
    <a className="skip-link" href="#main-content">跳到主要内容</a>
    <Header currentUser={auth.currentUser} userAvatar={userAvatar} onStats={loadStats} onFeedback={() => setFeedbackOpen(true)} onLogin={showLogin} onLogout={logout} onPassword={() => setPasswordOpen(true)} onAvatar={setAvatarOpen} onNavigate={navigate} />
    <div className="workspace-grid">
      <Sidebar sessions={sessions} activeId={activeSession.id} onSelect={(id) => { cancelAsk(); setActiveId(id); if (route !== '/') navigate('/') }} onNew={createSession} onUpload={uploadFile} uploadState={uploadState} knowledgeCount={knowledgeFiles.length} workspaceName={workspaceSummary.rootName} workspaceSelected={workspaceSummary.selected} onTheme={toggleTheme} theme={theme} onWorkspace={openWorkspace} onRename={renameSession} onDelete={deleteSession} />
      {route === '/workspace' ? <WorkspaceView username={auth.currentUser} sessionTitle={activeSession.title} messages={activeSession.messages} onLogin={showLogin} onNotice={setNotice} onClose={() => navigate('/')} onWorkspaceChange={setWorkspaceSummary} />
        : route === '/knowledge' ? <KnowledgeView username={auth.currentUser} onLogin={showLogin} onNotice={setNotice} onClose={() => navigate('/')} onChanged={setKnowledgeFiles} />
        : route === '/learning' ? <LearningView username={auth.currentUser} sessionId={activeSession.id} messages={activeSession.messages} onLogin={showLogin} onNotice={setNotice} onClose={() => navigate('/')} />
        : route === '/admin' ? <AdminView onNotice={setNotice} />
        : <><ChatPanel title={activeSession.title} userAvatar={userAvatar} aiAvatar={aiAvatar} messages={activeSession.messages} input={input} onInput={setInput} onSend={sendMessage} onStop={() => cancelAsk(true)} onPrompt={setInput} onUpload={attachFile} attachments={activeAttachments} attachmentBusy={attachmentBusy} onRemoveAttachment={removeAttachment} loading={loading} error={error} models={models} selectedModel={selectedModel} onModelChange={changeModel} tutorMode={tutorMode} onTutorModeChange={(mode) => { setTutorMode(mode); localStorage.setItem('tutorMode', mode); setNotice('导师方式已切换') }} appMode={appMode} onAppModeChange={changeAppMode} workspaceName={workspaceSummary.rootName} workspaceSelected={workspaceSummary.selected} onWorkspace={openWorkspace} onVoice={startVoice} onExportMarkdown={exportMarkdown} onExportPdf={exportPdf} onShare={share} onClear={clearSession} onLearning={() => navigate('/learning')} /><LearningSidebar username={auth.currentUser} sessionId={activeSession.id} messages={activeSession.messages} onLogin={showLogin} onNavigate={navigate} onNotice={setNotice} /></>}
    </div>
    {notice && <div className="toast-notice" role="status">{notice}</div>}

    <Dialog open={authOpen} title={authMode === 'login' ? '登录' : '注册'} onClose={() => setAuthOpen(false)} footer={<><button onClick={() => { setAuthMode(authMode === 'login' ? 'register' : 'login'); setAuthError('') }}>{authMode === 'login' ? '创建账号' : '返回登录'}</button><button className="dialog-primary" onClick={submitAuth}>{authMode === 'login' ? '登录' : '注册'}</button></>}><div className="dialog-form"><label>用户名<input value={authForm.username} onChange={(e) => setAuthForm((value) => ({ ...value, username: e.target.value }))} autoComplete="username" /></label><label>密码<input type="password" value={authForm.password} onChange={(e) => setAuthForm((value) => ({ ...value, password: e.target.value }))} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} /></label>{authError && <p className="dialog-error">{authError}</p>}</div></Dialog>
    <Dialog open={!!avatarOpen} title={avatarOpen === 'ai' ? '选择 AI 头像' : '选择用户头像'} onClose={() => setAvatarOpen(null)}><div className="avatar-picker-grid">{(avatarOpen === 'ai' ? AI_AVATARS : USER_AVATARS).map((avatar) => <button type="button" key={avatar} className={(avatarOpen === 'ai' ? aiAvatar : userAvatar) === avatar ? 'is-selected' : ''} onClick={() => chooseAvatar(avatar)} aria-label={`选择头像 ${avatar}`}>{avatar}</button>)}</div></Dialog>
    <Dialog open={passwordOpen} title="修改密码" onClose={() => setPasswordOpen(false)} footer={<><button onClick={() => setPasswordOpen(false)}>取消</button><button className="dialog-primary" onClick={async () => { try { await auth.changePassword(passwordForm.old, passwordForm.next); setPasswordOpen(false); setPasswordForm({ old: '', next: '' }); setNotice('密码已修改') } catch (e) { setNotice(e instanceof Error ? e.message : '修改失败') } }}>保存</button></>}><div className="dialog-form"><label>原密码<input type="password" value={passwordForm.old} onChange={(e) => setPasswordForm((value) => ({ ...value, old: e.target.value }))} /></label><label>新密码<input type="password" value={passwordForm.next} onChange={(e) => setPasswordForm((value) => ({ ...value, next: e.target.value }))} /></label></div></Dialog>
    <Dialog open={feedbackOpen} title="提交反馈" onClose={() => setFeedbackOpen(false)} footer={<><button onClick={() => setFeedbackOpen(false)}>取消</button><button className="dialog-primary" disabled={!feedback.trim()} onClick={async () => { try { await apiFetch('/api/feedback', jsonBody({ content: feedback, session_id: activeSession.id })); setFeedback(''); setFeedbackOpen(false); setNotice('感谢你的反馈') } catch (e) { setNotice(e instanceof Error ? e.message : '提交失败') } }}>提交</button></>}><label className="dialog-field">反馈内容<textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="请描述遇到的问题或建议" /></label></Dialog>
    <Dialog open={statsOpen} title="学习统计" onClose={() => setStatsOpen(false)} width="medium">
      <div className="stats-dialog">
        {!stats ? <div className="stats-loading"><span className="answer-loading-dot" />正在读取统计...</div> : stats.error ? <p className="dialog-error">{stats.error}</p> : <>
          <section><h3>当前会话</h3><div className="stats-grid"><span className="stats-metric"><strong>{formatStat(stats.session.count)}</strong><small>次提问</small></span><span className="stats-metric"><strong>{formatStat(stats.session.tokens)}</strong><small>Token</small></span></div></section>
          {stats.user && <section><h3>我的学习</h3><div className="stats-grid stats-grid-wide"><span className="stats-metric"><strong>{formatStat(stats.user.today_queries)}</strong><small>今日提问</small></span><span className="stats-metric"><strong>{formatStat(stats.user.today_tokens)}</strong><small>今日 Token</small></span><span className="stats-metric"><strong>{formatStat(stats.user.total_queries)}</strong><small>累计提问</small></span><span className="stats-metric"><strong>{formatStat(stats.user.total_tokens)}</strong><small>累计 Token</small></span></div></section>}
          <section><h3>全局</h3><div className="stats-grid stats-grid-wide"><span className="stats-metric"><strong>{formatStat(stats.global.user_count)}</strong><small>用户</small></span><span className="stats-metric"><strong>{formatStat(stats.global.active_sessions)}</strong><small>活跃会话</small></span><span className="stats-metric"><strong>{formatStat(stats.global.total_queries)}</strong><small>累计提问</small></span><span className="stats-metric"><strong>{formatStat(stats.global.total_tokens)}</strong><small>累计 Token</small></span></div></section>
        </>}
      </div>
    </Dialog>
    <Dialog open={!!renameId} title="重命名会话" onClose={() => setRenameId('')} footer={<><button onClick={() => setRenameId('')}>取消</button><button className="dialog-primary" onClick={saveRename}>保存</button></>}><label className="dialog-field">会话标题<input value={renameValue} maxLength={40} onChange={(e) => setRenameValue(e.target.value)} /></label></Dialog>
    <Dialog open={!!confirmState} title={confirmState?.title || '确认操作'} onClose={() => setConfirmState(null)} footer={<><button onClick={() => setConfirmState(null)}>取消</button><button className="dialog-danger" onClick={async () => { const state = confirmState; setConfirmState(null); if (state) { try { await state.action() } catch (e) { setNotice(e instanceof Error ? e.message : '操作失败') } } }}>{confirmState?.label || '确认删除'}</button></>}>{confirmState?.message}</Dialog>
  </div>
}
