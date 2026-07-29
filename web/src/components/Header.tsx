import { BarChart3, BookOpenCheck, Bot, Database, KeyRound, LogOut, MessageSquareText, PanelsTopLeft, Settings, Shield, Smile, UserRound } from 'lucide-react'
import { useRef, useState } from 'react'
import { Menu } from './Menu'

interface HeaderProps {
  currentUser: string
  userAvatar: string
  onStats: () => void
  onFeedback: () => void
  onLogin: () => void
  onLogout: () => void
  onPassword: () => void
  onAvatar: (kind: 'user' | 'ai') => void
  onNavigate: (path: string) => void
}

export function Header({ currentUser, userAvatar, onStats, onFeedback, onLogin, onLogout, onPassword, onAvatar, onNavigate }: HeaderProps) {
  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLButtonElement>(null)
  const act = (callback: () => void) => { setProfileOpen(false); callback() }

  return (
    <header className="app-header">
      <div className="header-inner">
        <button className="brand-block brand-button" type="button" aria-label="返回对话" onClick={() => onNavigate('/')}>
          <span className="brand-mark" aria-hidden="true">知</span>
          <span><strong>全能 AI 导师</strong><small>你的 AI 学习工作台</small></span>
        </button>
        <nav className="header-actions" aria-label="全局工具">
          <span className="knowledge-status" role="status"><span className="status-dot" aria-hidden="true" />知识库已就绪</span>
          <a className="text-action" href="/legacy" aria-label="切换到旧版界面"><PanelsTopLeft size={17} />旧版</a>
          <button type="button" className="text-action" onClick={onStats}><BarChart3 size={17} />学习统计</button>
          <button type="button" className="text-action" onClick={onFeedback}><MessageSquareText size={17} />反馈</button>
          <button
            ref={profileRef}
            type="button"
            className="account-action"
            aria-haspopup="menu"
            aria-expanded={profileOpen}
            onClick={() => currentUser ? setProfileOpen((value) => !value) : onLogin()}
          >
            <span className="account-avatar">{currentUser ? userAvatar : <UserRound size={18} />}</span>{currentUser || '登录'}
          </button>
          <Menu open={profileOpen} anchor={profileRef.current} onClose={() => setProfileOpen(false)} label="账号菜单">
            <div className="menu-user"><strong>{currentUser}</strong><small>学习账号</small></div>
            <button role="menuitem" type="button" onClick={() => act(() => onNavigate('/learning'))}><BookOpenCheck size={16} />学习管理</button>
            <button role="menuitem" type="button" onClick={() => act(() => onNavigate('/workspace'))}><Settings size={16} />任务工作区</button>
            <button role="menuitem" type="button" onClick={() => act(() => onAvatar('user'))}><Smile size={16} />用户头像</button>
            <button role="menuitem" type="button" onClick={() => act(() => onAvatar('ai'))}><Bot size={16} />AI 头像</button>
            <button role="menuitem" type="button" onClick={() => act(() => onNavigate('/knowledge'))}><Database size={16} />知识库管理</button>
            <button role="menuitem" type="button" onClick={() => act(onPassword)}><KeyRound size={16} />修改密码</button>
            <button role="menuitem" type="button" className="admin-menu-item" onClick={() => act(() => onNavigate('/admin'))}><Shield size={16} />管理入口</button>
            <button role="menuitem" type="button" className="danger-menu-item" onClick={() => act(onLogout)}><LogOut size={16} />退出登录</button>
          </Menu>
        </nav>
      </div>
    </header>
  )
}
