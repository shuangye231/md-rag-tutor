import { Sparkles } from 'lucide-react'

interface AiThinkingProps {
  avatar: string
}

export function AiThinking({ avatar }: AiThinkingProps) {
  return (
    <div className="ai-thinking" role="status" aria-live="polite">
      <span className="ai-thinking-avatar" aria-hidden="true">
        <span>{avatar}</span>
        <i><Sparkles size={11} /></i>
      </span>
      <span className="ai-thinking-copy">
        <strong>AI 导师正在思考</strong>
        <small>正在结合当前会话与知识库整理回答</small>
      </span>
      <span className="ai-thinking-dots" aria-hidden="true"><i /><i /><i /></span>
    </div>
  )
}
