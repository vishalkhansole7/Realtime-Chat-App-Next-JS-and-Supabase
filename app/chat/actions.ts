'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import type { Profile } from '@/types/database'

// 1. Search users by username or full name
export async function searchUsers(query: string): Promise<Profile[]> {
  if (!query.trim()) return []

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return []

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .neq('id', user.id) // Exclude self
    .or(`username.ilike.%${query}%,full_name.ilike.%${query}%`)
    .limit(8)

  if (error) {
    console.error('Search error:', error.message)
    return []
  }

  return data || []
}

// 2. Initiate a chat request or redirect if one already exists
export async function initiateChat(targetUserId: string, initialMessage?: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Check if a conversation between these two already exists
  const { data: existingChats } = await supabase
    .from('conversation_participants')
    .select('conversation_id')
    .eq('user_id', user.id)

  if (existingChats && existingChats.length > 0) {
    const conversationIds = existingChats.map((c) => c.conversation_id)

    const { data: match } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .in('conversation_id', conversationIds)
      .eq('user_id', targetUserId)
      .maybeSingle()

    if (match) {
      redirect(`/chat/${match.conversation_id}`)
    }
  }

  // Create new conversation with 'pending' status
  const { data: newConv, error: convError } = await supabase
    .from('conversations')
    .insert({
      initiated_by: user.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (convError || !newConv) {
    throw new Error(convError?.message || 'Failed to start conversation')
  }

  // Add both as participants
  await supabase.from('conversation_participants').insert([
    { conversation_id: newConv.id, user_id: user.id },
    { conversation_id: newConv.id, user_id: targetUserId },
  ])

  // Optional initial message
  if (initialMessage && initialMessage.trim()) {
    await supabase.from('messages').insert({
      conversation_id: newConv.id,
      sender_id: user.id,
      content: initialMessage.trim(),
      message_type: 'text',
    })
  }

  revalidatePath('/chat')
  redirect(`/chat/${newConv.id}`)
}

// 3. Accept a pending request
export async function acceptRequest(conversationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error } = await supabase
    .from('conversations')
    .update({ status: 'accepted' })
    .eq('id', conversationId)

  if (error) throw new Error(error.message)

  revalidatePath('/chat')
  revalidatePath(`/chat/${conversationId}`)
}

// 4. Decline / delete a request
export async function declineRequest(conversationId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { error } = await supabase
    .from('conversations')
    .delete()
    .eq('id', conversationId)

  if (error) throw new Error(error.message)

  revalidatePath('/chat')
  redirect('/chat')
}