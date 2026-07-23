import { useEffect, useState } from 'react'
import { useNetworkStore } from '@/app/networkStore'
import { useUiStore } from '@/app/uiStore'
import { Button, Panel } from '@/ui/common/Panel'

export function AuthModal() {
  const closeModal = useUiStore((s) => s.closeModal)
  const status = useNetworkStore((s) => s.status)
  const authError = useNetworkStore((s) => s.authError)
  const register = useNetworkStore((s) => s.register)
  const resendConfirmation = useNetworkStore((s) => s.resendConfirmation)
  const login = useNetworkStore((s) => s.login)

  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [info, setInfo] = useState<string | null>(null)
  const [resendCooldown, setResendCooldown] = useState(0)

  useEffect(() => {
    if (resendCooldown <= 0) return
    const timer = setInterval(() => setResendCooldown((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(timer)
  }, [resendCooldown])

  if (status === 'unconfigured') {
    return (
      <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6" onClick={closeModal}>
        <Panel paper className="w-full max-w-sm p-5" >
          <div onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold">Онлайн-режим</h2>
              <button onClick={closeModal} className="text-lg opacity-60 hover:opacity-100">✕</button>
            </div>
            <p className="text-sm opacity-80 leading-snug">
              Регистрация и общий чат/список игроков работают через Supabase, но ключи проекта не заданы
              (файл <code className="bg-black/10 px-1 rounded">.env.local</code>). Игра при этом полностью
              играбельна офлайн — прогресс сохраняется локально в браузере.
            </p>
            <Button className="mt-4" onClick={closeModal}>Понятно</Button>
          </div>
        </Panel>
      </div>
    )
  }

  const submit = async () => {
    setBusy(true)
    setInfo(null)
    if (mode === 'login') {
      const ok = await login(email, password)
      if (ok) closeModal()
    } else {
      const ok = await register(email, password, username || 'Рыболов')
      if (ok) {
        setInfo('Проверьте почту для подтверждения, затем войдите.')
        setResendCooldown(30)
      }
    }
    setBusy(false)
  }

  const resend = async () => {
    setBusy(true)
    const ok = await resendConfirmation(email)
    if (ok) {
      setInfo('Письмо отправлено повторно — проверьте почту.')
      setResendCooldown(30)
    }
    setBusy(false)
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-center justify-center p-6" onClick={closeModal}>
      <Panel paper className="w-full max-w-sm p-5" >
        <div onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold">{mode === 'login' ? 'Вход' : 'Регистрация'}</h2>
            <button onClick={closeModal} className="text-lg opacity-60 hover:opacity-100">✕</button>
          </div>

          <div className="flex flex-col gap-2">
            {mode === 'register' && (
              <input
                value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Имя рыболова"
                className="bg-black/5 rounded-sm px-3 py-2 text-sm outline-none border border-black/10"
              />
            )}
            <input
              value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
              className="bg-black/5 rounded-sm px-3 py-2 text-sm outline-none border border-black/10"
            />
            <input
              value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Пароль" type="password"
              className="bg-black/5 rounded-sm px-3 py-2 text-sm outline-none border border-black/10"
            />
          </div>

          {authError && <div className="text-xs text-ember-500 mt-2">{authError}</div>}
          {info && <div className="text-xs text-moss-500 mt-2">{info}</div>}

          {mode === 'register' && info && (
            <button
              className="text-xs opacity-70 hover:opacity-100 underline mt-2 disabled:opacity-30 disabled:no-underline"
              disabled={busy || resendCooldown > 0}
              onClick={() => void resend()}
            >
              {resendCooldown > 0 ? `Отправить код ещё раз (${resendCooldown}с)` : 'Отправить код ещё раз'}
            </button>
          )}

          <Button className="w-full mt-4" disabled={busy || !email || !password} onClick={() => void submit()}>
            {mode === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </Button>
          <button
            className="text-xs opacity-60 hover:opacity-100 mt-3 underline"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти'}
          </button>
        </div>
      </Panel>
    </div>
  )
}
