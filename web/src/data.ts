import type { Message, Session } from './types'

export const starterMessages: Message[] = [
  {
    id: 'starter-user',
    role: 'user',
    content: 'RAG 和 Agent 有什么区别？能举例说明吗？',
    createdAt: Date.now() - 60_000,
  },
  {
    id: 'starter-assistant',
    role: 'assistant',
    content: 'RAG 是“先查资料再回答”，Agent 是“先想清楚步骤，再调用工具完成任务”。',
    showcase: true,
    createdAt: Date.now(),
  },
]

export const defaultSessions: Session[] = [
  {
    id: 'rag-agent',
    title: 'RAG 和 Agent 的区别',
    messages: starterMessages,
    updatedAt: Date.now(),
  },
  { id: 'langchain', title: 'LangChain 入门路线', messages: [], updatedAt: Date.now() - 86_400_000 },
  { id: 'token', title: 'Token 与上下文窗口', messages: [], updatedAt: Date.now() - 172_800_000 },
  { id: 'plan', title: 'AI 开发学习计划', messages: [], updatedAt: Date.now() - 259_200_000 },
]

export const followUps = ['继续追问', '举例说明', '对比表格', '应用场景']

export const routeSteps = [
  { number: '01', title: '理解 RAG 基础', meta: '已完成', status: 'done' },
  { number: '02', title: '掌握检索与向量化', meta: '进行中', status: 'active' },
  { number: '03', title: '认识 Agent 工作流', meta: '下一步', status: 'pending' },
  { number: '04', title: '完成一个 RAG 项目', meta: '待开始', status: 'pending' },
]
