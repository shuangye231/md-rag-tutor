import { ArrowRight, Check, ChevronRight, Flame, Trash2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { apiFetch, jsonBody } from '../api/client'
import type { Message } from '../types'
import { Dialog } from './Dialog'
import { LearningGeneration } from './LearningGeneration'

interface PlanItem { day: number; title: string; task: string; done: boolean }
interface LearningSidebarProps { username: string; sessionId: string; messages: Message[]; onLogin: () => void; onNavigate: (path: string) => void; onNotice: (text: string) => void }
const tabs = ['路线', '笔记', '练习', '错题'] as const
type Tab = typeof tabs[number]
type GenerationKind = '路线' | '笔记' | '练习'

const minimumAnimation = () => new Promise((resolve) => setTimeout(resolve, 650))

export function LearningSidebar({ username, sessionId, messages, onLogin, onNavigate, onNotice }: LearningSidebarProps) {
  const [tab, setTab] = useState<Tab>('路线')
  const [plan, setPlan] = useState<{ goal: string; plan: PlanItem[] }>({ goal: '', plan: [] })
  const [daily, setDaily] = useState<any>(null)
  const [notes, setNotes] = useState<any[]>([])
  const [mistakes, setMistakes] = useState<any[]>([])
  const [generating, setGenerating] = useState<GenerationKind | null>(null)
  const [errors, setErrors] = useState<Partial<Record<Tab, string>>>({})
  const [confirmAction, setConfirmAction] = useState<{ title: string; message: string; run: () => Promise<void> } | null>(null)
  const setTabError = (target: Tab, value = '') => setErrors((current) => ({ ...current, [target]: value }))
  const errorMessage = (reason: unknown, fallback: string) => reason instanceof Error ? reason.message : fallback
  const hasAnswer = messages.some((message) => message.role === 'assistant' && message.content.trim())

  const load = async () => {
    if (!username) return
    setErrors({})
    const user = encodeURIComponent(username)
    const [planResult, dailyResult, noteResult, mistakeResult] = await Promise.allSettled([
      apiFetch<any>(`/api/learning/plan/${user}/${encodeURIComponent(sessionId)}`),
      apiFetch<any>(`/api/learning/daily/${user}`),
      apiFetch<any>(`/api/learning/notes/${user}/${encodeURIComponent(sessionId)}`),
      apiFetch<any>(`/api/learning/mistakes/${user}/${encodeURIComponent(sessionId)}`),
    ])
    if (planResult.status === 'fulfilled') setPlan(planResult.value)
    else setTabError('路线', errorMessage(planResult.reason, '路线读取失败'))
    if (dailyResult.status === 'fulfilled') setDaily(dailyResult.value)
    else setTabError('路线', errorMessage(dailyResult.reason, '学习进度读取失败'))
    if (noteResult.status === 'fulfilled') setNotes(noteResult.value.notes || [])
    else setTabError('笔记', errorMessage(noteResult.reason, '笔记读取失败'))
    if (mistakeResult.status === 'fulfilled') setMistakes(mistakeResult.value.mistakes || [])
    else setTabError('错题', errorMessage(mistakeResult.reason, '错题读取失败'))
  }
  useEffect(() => { setErrors({}); void load() }, [username, sessionId])

  const requireLogin = () => { if (!username) { onLogin(); return false } return true }
  const createPlan = async () => {
    if (!requireLogin()) return
    setGenerating('路线'); setTabError('路线')
    try {
      const [data] = await Promise.all([apiFetch<any>('/api/learning/plan', jsonBody({ username, session_id: sessionId, messages })), minimumAnimation()])
      setPlan(data); onNotice('已根据本次 AI 回答生成路线')
    } catch (e) { setTabError('路线', errorMessage(e, '生成失败')) } finally { setGenerating(null) }
  }
  const createNote = async () => {
    if (!requireLogin()) return
    setGenerating('笔记'); setTabError('笔记')
    try {
      await Promise.all([apiFetch('/api/learning/note', jsonBody({ username, session_id: sessionId, messages })), minimumAnimation()])
      onNotice('学习笔记已保存'); await load(); setTab('笔记')
    } catch (e) { setTabError('笔记', errorMessage(e, '生成失败')); setTab('笔记') } finally { setGenerating(null) }
  }
  const createQuiz = async () => {
    if (!requireLogin()) return
    setGenerating('练习'); setTabError('练习')
    try {
      const [data] = await Promise.all([apiFetch<{ quiz: any[] }>('/api/learning/quiz', jsonBody({ username, session_id: sessionId, messages })), minimumAnimation()])
      sessionStorage.setItem(`learningQuiz:${sessionId}`, JSON.stringify(data.quiz || []))
      onNotice('已从本次 AI 回答生成 3 道练习'); onNavigate('/learning?tab=quiz')
    } catch (e) { setTabError('练习', errorMessage(e, '出题失败')); setTab('练习') } finally { setGenerating(null) }
  }
  const deleteItem = async (run: () => Promise<void>) => {
    await run(); await load(); onNotice('已删除')
  }

  const done = plan.plan.filter((item) => item.done).length
  const progress = plan.plan.length ? Math.round(done / plan.plan.length * 100) : 0
  const generationDisabled = generating !== null || !hasAnswer

  return <>
    <aside className="learning-sidebar" aria-label="学习助手">
      <div className="learning-head"><div><h2>学习助手</h2><p>把对话变成可复习的进度</p></div><span className="streak"><Flame size={15} />连续 {daily?.streak || 0} 天</span></div>
      <div className="learning-tabs" role="tablist" aria-label="学习内容">{tabs.map((item) => <button key={item} role="tab" aria-selected={tab === item} className={tab === item ? 'is-active' : ''} onClick={() => { setTabError(tab); setTab(item) }}>{item}</button>)}</div>
      {!username ? <div className="learning-placeholder"><strong>登录后保存学习进度</strong><p>路线、笔记、练习和错题会跟随账号保存。</p><button onClick={onLogin}>登录</button></div> : errors[tab] ? <div className="learning-placeholder"><strong>暂时无法读取</strong><p>{errors[tab]}</p><button onClick={() => { setTabError(tab); void load() }}>重试</button></div> : (
        <div className="learning-content" role="tabpanel" aria-busy={generating !== null}>
          {generating && <LearningGeneration kind={generating} />}
          {!hasAnswer && <p className="generation-hint">完成一次 AI 问答后，即可从回答中生成路线、笔记和练习。</p>}
          {tab === '路线' && <>
            <section className="progress-section"><div className="section-title"><strong>当前路线进度</strong><b>{progress}%</b></div><div className="progress-track"><span style={{ width: `${progress}%` }} /></div><p>{plan.plan.length ? `已完成 ${done}/${plan.plan.length} 个学习任务` : '还没有为当前会话生成路线'}</p></section>
            <section className="route-section"><div className="side-section-head"><h3>当前路线</h3>{plan.plan.length > 0 && <button className="side-delete" type="button" title="删除当前路线" aria-label="删除当前路线" onClick={() => setConfirmAction({ title: '删除学习路线', message: '删除后不会影响聊天记录，但路线进度无法恢复。', run: () => deleteItem(() => apiFetch(`/api/learning/plans/${encodeURIComponent(username)}/${encodeURIComponent(sessionId)}`, { method: 'DELETE' })) })}><Trash2 size={14} /></button>}</div><div className="route-list">{plan.plan.length ? plan.plan.map((step) => <button type="button" className={`route-row ${step.done ? 'done' : ''}`} key={step.day} onClick={async () => { const data = await apiFetch<any>('/api/learning/plan/toggle', jsonBody({ username, session_id: sessionId, day: step.day })); setPlan(data) }}><span className="route-number">{String(step.day).padStart(2, '0')}</span><span><strong>{step.title}</strong><small>{step.done ? '已完成' : '待完成'}</small></span>{step.done && <Check size={17} />}</button>) : <button className="primary-inline" disabled={generationDisabled} onClick={createPlan}>根据本次回答生成路线</button>}</div></section>
            <section className="next-section"><h3>接下来</h3><button type="button" className="next-action" disabled={generationDisabled} onClick={createNote}><span><strong>生成本节笔记</strong><small>整理当前 AI 回答重点</small></span><ArrowRight size={17} /></button><button type="button" className="next-action" disabled={generationDisabled} onClick={createQuiz}><span><strong>开始 3 道练习</strong><small>基于本次回答检验理解</small></span><ArrowRight size={17} /></button></section>
          </>}
          {tab === '笔记' && <section className="side-records"><button className="primary-inline" disabled={generationDisabled} onClick={createNote}>整理当前对话为笔记</button>{notes.map((note) => <div className="side-record-item" key={note.id}><button className="side-record-main" onClick={() => onNavigate('/learning?tab=notes')}><span><strong>{note.title}</strong><small>{new Date(note.created_at).toLocaleDateString('zh-CN')}</small></span><ChevronRight size={16} /></button><button className="side-delete" title="删除笔记" aria-label={`删除笔记 ${note.title}`} onClick={() => setConfirmAction({ title: '删除学习笔记', message: '这篇笔记及其复习安排将被永久删除。', run: () => deleteItem(() => apiFetch(`/api/learning/notes/${encodeURIComponent(username)}/${note.id}`, { method: 'DELETE' })) })}><Trash2 size={14} /></button></div>)}</section>}
          {tab === '练习' && <section className="side-records"><p>直接使用当前 AI 回答生成 3 道递进式开放题，不额外调用模型。</p><button className="primary-inline" disabled={generationDisabled} onClick={createQuiz}>根据本次回答生成练习</button><button className="side-record-main" onClick={() => onNavigate('/learning?tab=quiz')}><span><strong>打开练习区</strong><small>查看题目与练习记录</small></span><ChevronRight size={16} /></button></section>}
          {tab === '错题' && <section className="side-records">{mistakes.length ? mistakes.map((item) => <div className="side-record-item" key={item.id}><button className="side-record-main" onClick={() => onNavigate('/learning?tab=mistakes')}><span><strong>{item.question}</strong><small>等待复习</small></span><ChevronRight size={16} /></button><button className="side-delete" title="删除错题" aria-label={`删除错题 ${item.question}`} onClick={() => setConfirmAction({ title: '删除错题记录', message: '删除后，这次作答和对应复习安排将无法恢复。', run: () => deleteItem(() => apiFetch(`/api/learning/attempts/${encodeURIComponent(username)}/${item.id}`, { method: 'DELETE' })) })}><Trash2 size={14} /></button></div>) : <p>暂时没有需要回看的回答。</p>}</section>}
        </div>
      )}
      {username && <button className="learning-manage-link" onClick={() => onNavigate('/learning')}>打开完整学习管理 <ChevronRight size={15} /></button>}
    </aside>
    <Dialog open={!!confirmAction} title={confirmAction?.title || '确认删除'} onClose={() => setConfirmAction(null)} footer={<><button onClick={() => setConfirmAction(null)}>取消</button><button className="dialog-danger" onClick={async () => { const action = confirmAction; setConfirmAction(null); if (action) await action.run() }}>确认删除</button></>}>{confirmAction?.message}</Dialog>
  </>
}
