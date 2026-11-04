'use client'

import { useState, useEffect, useTransition, Suspense } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { searchUsers, initiateChat, acceptRequest, declineRequest } from './actions'
import {
  MessageSquare,
  UserPlus,
  Search,
  Check,
  X,
  User,
  Loader2,
} from 'lucide-react'
import type { Profile, ConversationItem } from '@/types/database'

function ChatLayoutContent({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const params = useParams()
  const router = useRouter()
  const currentChatId = params?.id as string | undefined

  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [activeTab, setActiveTab] = useState<'chats' | 'requests'>('chats')
  const [conversations, setConversations] = useState<ConversationItem[]>([])
  const [requests, setRequests] = useState<ConversationItem[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Profile[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [, startTransition] = useTransition()

  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profile) setCurrentUser(profile)

    const { data: participantRows } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id,
          status,
          initiated_by,
          updated_at
        )
      `)
      .eq('user_id', user.id)

    if (!participantRows) return

    const convIds = participantRows.map((r: any) => r.conversation_id)
    if (convIds.length === 0) {
      setConversations([])
      setRequests([])
      return
    }

    const { data: allParticipants } = await supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        user_id,
        profiles (*)
      `)
      .in('conversation_id', convIds)
      .neq('user_id', user.id)

    const { data: rawMessages } = await supabase
      .from('messages')
      .select('conversation_id, content, sender_id, is_read, created_at')
      .in('conversation_id', convIds)
      .order('created_at', { ascending: false })

    const chatsList: ConversationItem[] = []
    const requestsList: ConversationItem[] = []

    participantRows.forEach((r: any) => {
      const conv = r.conversations
      if (!conv) return

      const other = allParticipants?.find((p: any) => p.conversation_id === conv.id)
      const convMessages = rawMessages?.filter((m) => m.conversation_id === conv.id) || []
      const unreadCount = convMessages.filter(
        (m) => !m.is_read && m.sender_id !== user.id
      ).length
      const lastMsg = convMessages[0]?.content || ''

      const item: ConversationItem = {
        id: conv.id,
        status: conv.status,
        initiated_by: conv.initiated_by,
        updated_at: conv.updated_at,
        other_user: other?.profiles as unknown as Profile,
        last_message: lastMsg,
        unread_count: unreadCount,
      }

      if (conv.status === 'accepted') {
        chatsList.push(item)
      } else if (conv.status === 'pending') {
        if (conv.initiated_by !== user.id) {
          requestsList.push(item)
        } else {
          chatsList.push({ ...item, isOutgoing: true })
        }
      }
    })

    chatsList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    requestsList.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

    setConversations(chatsList)
    setRequests(requestsList)
  }

  useEffect(() => {
    loadData()

    const channel = supabase
      .channel('chat_layout_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        loadData()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadData()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([])
      return
    }

    const timer = setTimeout(async () => {
      setIsSearching(true)
      const results = await searchUsers(searchQuery)
      setSearchResults(results)
      setIsSearching(false)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  return (
    <div className="flex h-[100dvh] w-full bg-zinc-950 text-zinc-100 overflow-hidden">
      <aside
        className={`w-full md:w-80 lg:w-96 flex flex-col border-r border-zinc-800 bg-zinc-900/60 shrink-0 ${
          currentChatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-3.5 border-b border-zinc-800 flex items-center justify-between">
          <Link href="/profile" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center font-semibold text-xs">
              {currentUser?.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt={currentUser.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                currentUser?.username?.slice(0, 2).toUpperCase() || 'U'
              )}
            </div>
            <div className="text-left">
              <h2 className="text-xs font-semibold group-hover:text-indigo-400 transition-colors">
                {currentUser?.full_name || currentUser?.username}
              </h2>
              <p className="text-[11px] text-zinc-500">@{currentUser?.username}</p>
            </div>
          </Link>

          <Link
            href="/profile"
            className="p-2 rounded-lg bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors"
          >
            <User className="w-4 h-4" />
          </Link>
        </div>

        <div className="p-3 border-b border-zinc-800/80 relative">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-800/60 border border-zinc-700/60 rounded-xl text-xs placeholder-zinc-500 text-white focus:outline-none focus:border-indigo-500"
            />
            {isSearching && (
              <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin absolute right-3 top-2.5" />
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="absolute top-14 left-3 right-3 z-50 p-1.5 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl max-h-56 overflow-y-auto space-y-1">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  onClick={() => {
                    setSearchQuery('')
                    setSearchResults([])
                    startTransition(() => {
                      initiateChat(user.id)
                    })
                  }}
                  className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-zinc-800 transition-colors text-left"
                >
                  <div className="w-7 h-7 rounded-full bg-zinc-800 overflow-hidden flex items-center justify-center text-xs font-semibold">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} className="w-full h-full object-cover" />
                    ) : (
                      user.username.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <p className="text-xs font-medium truncate text-white">{user.full_name || user.username}</p>
                    <p className="text-[10px] text-zinc-400">@{user.username}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex border-b border-zinc-800">
          <button
            onClick={() => setActiveTab('chats')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors ${
              activeTab === 'chats'
                ? 'border-indigo-500 text-indigo-400 bg-zinc-800/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            Chats
          </button>
          <button
            onClick={() => setActiveTab('requests')}
            className={`flex-1 py-2.5 text-xs font-semibold flex items-center justify-center gap-2 border-b-2 transition-colors relative ${
              activeTab === 'requests'
                ? 'border-indigo-500 text-indigo-400 bg-zinc-800/20'
                : 'border-transparent text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Requests
            {requests.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                {requests.length}
              </span>
            )}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-zinc-800/40">
          {activeTab === 'chats' ? (
            conversations.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No active conversations yet.
              </div>
            ) : (
              conversations.map((conv) => {
                const isSelected = conv.id === currentChatId
                return (
                  <Link
                    key={conv.id}
                    href={`/chat/${conv.id}`}
                    className={`flex items-center gap-3 p-3 transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/10 border-l-2 border-indigo-500'
                        : 'hover:bg-zinc-800/40'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-full bg-zinc-800 border border-zinc-700/80 overflow-hidden flex items-center justify-center text-xs font-semibold shrink-0">
                      {conv.other_user?.avatar_url ? (
                        <img
                          src={conv.other_user.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        conv.other_user?.username?.slice(0, 2).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <p className="text-xs font-semibold text-white truncate">
                          {conv.other_user?.full_name || conv.other_user?.username}
                        </p>
                        {conv.isOutgoing ? (
                          <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">
                            Pending
                          </span>
                        ) : conv.unread_count > 0 ? (
                          <span className="w-4 h-4 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
                            {conv.unread_count}
                          </span>
                        ) : null}
                      </div>
                      <p className="text-[11px] text-zinc-400 truncate">
                        {conv.last_message || `@${conv.other_user?.username}`}
                      </p>
                    </div>
                  </Link>
                )
              })
            )
          ) : (
            requests.length === 0 ? (
              <div className="p-8 text-center text-zinc-500 text-xs">
                No new chat requests.
              </div>
            ) : (
              requests.map((req) => (
                <div
                  key={req.id}
                  className="p-3 flex items-center justify-between gap-3 bg-zinc-900/40 hover:bg-zinc-800/30 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center text-xs font-semibold shrink-0">
                      {req.other_user?.avatar_url ? (
                        <img
                          src={req.other_user.avatar_url}
                          alt="Avatar"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        req.other_user?.username?.slice(0, 2).toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-white truncate">
                        {req.other_user?.full_name || req.other_user?.username}
                      </p>
                      <p className="text-[10px] text-zinc-400 truncate">
                        wants to connect
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => startTransition(() => acceptRequest(req.id))}
                      className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => startTransition(() => declineRequest(req.id))}
                      className="p-1.5 rounded-lg bg-red-600/20 text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </aside>

      <main
        className={`flex-1 flex flex-col h-[100dvh] overflow-hidden bg-zinc-950 ${
          !currentChatId ? 'hidden md:flex' : 'flex'
        }`}
      >
        {children}
      </main>
    </div>
  )
}

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <Suspense
      fallback={
        <div className="h-[100dvh] w-full flex items-center justify-center bg-zinc-950 text-zinc-500">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      }
    >
      <ChatLayoutContent>{children}</ChatLayoutContent>
    </Suspense>
  )
}