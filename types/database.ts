export type ConversationStatus = 'pending' | 'accepted' | 'declined'
export type MessageType = 'text' | 'code' | 'image' | 'file'

export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  created_at: string
  updated_at: string
}

export interface Reaction {
  id: string
  message_id: string
  user_id: string
  emoji: string
}

export interface Message {
  id: string
  conversation_id: string
  sender_id: string
  content: string
  message_type: MessageType
  is_read: boolean
  reply_to_id?: string | null
  reply_to?: Message | null
  created_at: string
  sender?: Profile
  reactions?: Reaction[]
}

export interface ConversationItem {
  id: string
  status: ConversationStatus
  initiated_by: string
  updated_at: string
  other_user: Profile
  last_message?: string
  unread_count: number
  isOutgoing?: boolean
}