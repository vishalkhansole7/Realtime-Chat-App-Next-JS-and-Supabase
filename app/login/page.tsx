'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { login, signup } from './actions'
import { Loader2 } from 'lucide-react'

function LoginForm() {
  const [isSignUp, setIsSignUp] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()

  const error = searchParams.get('error')
  const message = searchParams.get('message')

  // Redirect to /chat if already logged in
  useEffect(() => {
    async function checkUser() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        router.replace('/chat')
      } else {
        setCheckingAuth(false)
      }
    }
    checkUser()
  }, [router, supabase])

  if (checkingAuth) {
    return (
      <div className="flex items-center justify-center p-8 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight">
          {isSignUp ? 'Create your account' : 'Welcome back'}
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          {isSignUp
            ? 'Join the community and start chatting'
            : 'Enter your credentials to access your chats'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {message && (
        <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          {message}
        </div>
      )}

      <form className="space-y-4">
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
                placeholder="John Doe"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
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
                placeholder="johndoe24"
                className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
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
            placeholder="you@example.com"
            className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
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
            placeholder="••••••••"
            className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
          />
        </div>

        <button
          formAction={isSignUp ? signup : login}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg transition-colors text-sm shadow-md mt-2"
        >
          {isSignUp ? 'Sign Up' : 'Sign In'}
        </button>
      </form>

      <div className="mt-6 text-center text-sm text-zinc-400">
        {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
        <button
          type="button"
          onClick={() => setIsSignUp(!isSignUp)}
          className="text-indigo-400 hover:text-indigo-300 font-medium underline-offset-4 hover:underline ml-1"
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