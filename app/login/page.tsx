'use client'

import { useState, useTransition, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { login, signup } from './actions'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [isPending, startTransition] = useTransition()
  const searchParams = useSearchParams()

  const error = searchParams.get('error')
  const message = searchParams.get('message')

  const handleSubmit = (actionType: 'login' | 'signup') => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      if (actionType === 'signup') {
        await signup(formData)
      } else {
        await login(formData)
      }
    })
  }

  return (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-white">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {isSignUp
            ? 'Join the community and start chatting'
            : 'Enter your credentials to access your chats'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-start gap-2">
          <span>✅</span>
          <span>{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(isSignUp ? 'signup' : 'login')} className="space-y-4">
        {isSignUp && (
          <>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Full Name
              </label>
              <input
                name="full_name"
                type="text"
                required
                disabled={isPending}
                placeholder="John Doe"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
                Username
              </label>
              <input
                name="username"
                type="text"
                required
                disabled={isPending}
                placeholder="johndoe24"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
              />
            </div>
          </>
        )}

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Email Address
          </label>
          <input
            name="email"
            type="email"
            required
            disabled={isPending}
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
            Password
          </label>
          <input
            name="password"
            type="password"
            required
            minLength={6}
            disabled={isPending}
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm disabled:opacity-50"
          />
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/60 text-white font-medium rounded-lg transition-colors text-sm shadow-md mt-2 flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
            </>
          ) : (
            <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
          )}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-400">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          disabled={isPending}
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-indigo-400 hover:text-indigo-300 font-medium underline-offset-4 hover:underline ml-1 disabled:opacity-50"
        >
          {isSignUp ? 'Sign In' : 'Sign Up'}
        </button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 p-4">
      <Suspense
        fallback={
          <div className="flex items-center justify-center p-8 text-zinc-400">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </div>
  )
}
