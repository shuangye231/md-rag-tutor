export type Role = 'user' | 'assistant'

export interface Message {
  id: string
  role: Role
  content: string
  showcase?: boolean
  createdAt: number
}

export interface Session {
  id: string
  title: string
  messages: Message[]
  updatedAt: number
}

export interface SessionAttachment {
  id: string
  name: string
  size: number
}

export interface KnowledgeFile {
  stored_name: string
  name: string
  owner: string
  chunks: number
  size: number
  updated_at: string
}

export type AppMode = 'chat' | 'task'

export interface ModelOption {
  id: string
  name?: string
  label?: string
  current?: boolean
}
