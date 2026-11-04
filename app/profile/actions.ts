'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function updateProfile(formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const fullName = formData.get('full_name') as string
  const bio = formData.get('bio') as string
  const avatarUrl = formData.get('avatar_url') as string

  const updates: Record<string, any> = {
    updated_at: new Date().toISOString(),
  }

  if (fullName !== null) updates.full_name = fullName
  if (bio !== null) updates.bio = bio
  if (avatarUrl) updates.avatar_url = avatarUrl

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', user.id)

  if (error) {
    return redirect(`/profile?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/profile')
  revalidatePath('/chat')
  redirect('/chat')
}