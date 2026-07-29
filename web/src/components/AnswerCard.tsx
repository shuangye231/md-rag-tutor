import { Bot, Check, Search } from 'lucide-react'

const comparisons = [
  {
    name: 'RAG（检索增强生成）',
    icon: Search,
    description: '先从知识库检索相关信息，再基于这些信息生成答案。',
    flow: '核心：检索 → 增强 → 生成',
    tone: 'blue',
  },
  {
    name: 'Agent（智能体）',
    icon: Bot,
    description: '先理解目标、拆分步骤，选择并调用工具完成任务，最后汇总结果。',
    flow: '核心：规划 → 行动 → 观察 → 完成',
    tone: 'violet',
  },
]

export function AnswerCard() {
  return (
    <div className="answer-body">
      <h3>一句话理解</h3>
      <p>RAG 是“先查资料再回答”，Agent 是“先想清楚步骤，再调用工具完成任务”。</p>

      <div className="comparison-panel">
        {comparisons.map(({ name, icon: Icon, description, flow, tone }) => (
          <div className="comparison-row" key={name}>
            <div className="comparison-name">
              <span className={`comparison-icon ${tone}`}><Icon size={20} /></span>
              <strong>{name}</strong>
            </div>
            <div className="comparison-copy">
              <p>{description}</p>
              <span>{flow}</span>
            </div>
          </div>
        ))}
      </div>

      <h3>实际例子</h3>
      <p>你让 AI 帮你制定一个学习计划：</p>
      <ul className="example-list">
        <li><span className="bullet rag" />RAG：先查资料（如课程、资料），再生成学习计划。</li>
        <li><span className="bullet agent" />Agent：先拆分步骤（分析目标、安排时间、查找资源），再逐步执行并输出计划。</li>
      </ul>
      <div className="answer-note"><Check size={15} /> RAG 解决“依据什么回答”，Agent 解决“怎样把事情做完”。</div>
    </div>
  )
}
