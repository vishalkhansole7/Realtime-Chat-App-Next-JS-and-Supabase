'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function login(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    redirect('/login?error=Please fill in all fields')
  }

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    let friendlyError = error.message
    if (error.message.toLowerCase().includes('invalid login credentials')) {
      friendlyError = 'Incorrect email or password. Please try again.'
    } else if (error.message.toLowerCase().includes('email not confirmed')) {
      friendlyError = 'Please verify your email address before signing in.'
    }
    redirect(`/login?error=${encodeURIComponent(friendlyError)}`)
  }

  revalidatePath('/', 'layout')
  redirect('/chat')
}

export async function signup(formData: FormData) {
  const supabase = await createClient()

  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const username = formData.get('username') as string

  if (!email || !password || !fullName || !username) {
    redirect('/login?error=Please fill in all fields')
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        username: username.toLowerCase().trim(),
      },
    },
  })

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`)
  }

  // Supabase Auth returns an empty identities list when email is already registered
  if (data?.user?.identities && data.user.identities.length === 0) {
    redirect(
      `/login?error=${encodeURIComponent(
        'An account with this email already exists. Please sign in instead.'
      )}`
    )
  }

  // Check if session exists (e.g. Email confirmation disabled in Supabase)
  if (data?.session) {
    revalidatePath('/', 'layout')
    redirect('/chat')
  }

  redirect(
    `/login?message=${encodeURIComponent(
      'Account created! Check your email to confirm your account or sign in.'
    )}`
  )
}

export async function signout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
