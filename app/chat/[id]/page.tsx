'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Send, Code2, Loader2, ArrowLeft, Reply, Smile, X } from 'lucide-react'
import Link from 'next/link'
import type { Message, Profile, ConversationStatus, Reaction } from '@/types/database'

const EMOJI_LIST = ['❤️', '🔥', '👍', '😂', '😮', '🚀']

export default function ActiveChatPage() {
  const params = useParams()
  const router = useRouter()
  const conversationId = params?.id as string
  const supabase = createClient()

  const [messages, setMessages] = useState<Message[]>([])
  const [currentUser, setCurrentUser] = useState<Profile | null>(null)
  const [otherUser, setOtherUser] = useState<Profile | null>(null)
  const [conversationStatus, setConversationStatus] = useState<ConversationStatus>('accepted')
  const [inputText, setInputText] = useState('')
  const [isCodeMode, setIsCodeMode] = useState(false)
  const [replyingTo, setReplyingTo] = useState<Message | null>(null)
  const [activeReactionMsgId, setActiveReactionMsgId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  // Mark all unread messages sent by the other user as read
  async function markAsRead(userId: string) {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .eq('is_read', false)
  }

  useEffect(() => {
    async function initChat() {
      if (!conversationId) return

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/login')
        return
      }

      // 1. Current user profile
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()
      if (myProfile) setCurrentUser(myProfile)

      // 2. Conversation status
      const { data: conv } = await supabase
        .from('conversations')
        .select('status')
        .eq('id', conversationId)
        .single()
      if (conv) setConversationStatus(conv.status as ConversationStatus)

      // 3. Partner profile
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('user_id, profiles(*)')
        .eq('conversation_id', conversationId)
        .neq('user_id', user.id)
        .single()

      if (participants?.profiles) {
        setOtherUser(participants.profiles as unknown as Profile)
      }

      // 4. Load messages + reply metadata
      const { data: history } = await supabase
        .from('messages')
        .select(`
          *,
          reply_to:reply_to_id (*)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })

      // 5. Load reactions for these messages
      if (history && history.length > 0) {
        const msgIds = history.map((m) => m.id)
        const { data: reactionsData } = await supabase
          .from('message_reactions')
          .select('*')
          .in('message_id', msgIds)

        const combined = history.map((m) => ({
          ...m,
          reactions: reactionsData?.filter((r) => r.message_id === m.id) || [],
        }))

        setMessages(combined as Message[])
      } else {
        setMessages([])
      }

      await markAsRead(user.id)
      setLoading(false)
      setTimeout(scrollToBottom, 100)
    }

    initChat()

    // Realtime listeners for Messages and Reactions
    const msgChannel = supabase
      .channel(`chat_room_${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        async (payload) => {
          const newMsg = payload.new as Message
          if (newMsg.reply_to_id) {
            const { data: replyData } = await supabase
              .from('messages')
              .select('*')
              .eq('id', newMsg.reply_to_id)
              .single()
            newMsg.reply_to = replyData as Message
          }
          newMsg.reactions = []

          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id)) return prev
            return [...prev, newMsg]
          })

          const {
            data: { user },
          } = await supabase.auth.getUser()
          if (user && newMsg.sender_id !== user.id) {
            markAsRead(user.id)
          }

          setTimeout(scrollToBottom, 100)
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'message_reactions',
        },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const reaction = payload.new as Reaction
            setMessages((prev) =>
              prev.map((m) =>
                m.id === reaction.message_id
                  ? { ...m, reactions: [...(m.reactions || []), reaction] }
                  : m
              )
            )
          } else if (payload.eventType === 'DELETE') {
            const oldId = payload.old.id
            setMessages((prev) =>
              prev.map((m) => ({
                ...m,
                reactions: m.reactions?.filter((r) => r.id !== oldId) || [],
              }))
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(msgChannel)
    }
  }, [conversationId])

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault()
    if (!inputText.trim() || !currentUser || sending) return

    setSending(true)
    const content = inputText.trim()
    const msgType = isCodeMode ? 'code' : 'text'
    const replyId = replyingTo?.id || null

    setInputText('')
    setReplyingTo(null)

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_id: currentUser.id,
      content,
      message_type: msgType,
      reply_to_id: replyId,
    })

    setSending(false)
  }

  async function toggleReaction(messageId: string, emoji: string) {
    if (!currentUser) return
    setActiveReactionMsgId(null)

    const targetMsg = messages.find((m) => m.id === messageId)
    const existing = targetMsg?.reactions?.find(
      (r) => r.user_id === currentUser.id && r.emoji === emoji
    )

    if (existing) {
      await supabase.from('message_reactions').delete().eq('id', existing.id)
    } else {
      await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: currentUser.id,
        emoji,
      })
    }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-zinc-950">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden">
      {/* Top Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/60 backdrop-blur">
        <div className="flex items-center gap-3">
          <Link
            href="/chat"
            className="md:hidden p-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 overflow-hidden flex items-center justify-center text-xs font-semibold">
            {otherUser?.avatar_url ? (
              <img
                src={otherUser.avatar_url}
                alt={otherUser.username}
                className="w-full h-full object-cover"
              />
            ) : (
              otherUser?.username?.slice(0, 2).toUpperCase() || 'U'
            )}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">
              {otherUser?.full_name || otherUser?.username}
            </h3>
            <p className="text-[10px] text-zinc-400">@{otherUser?.username}</p>
          </div>
        </div>

        {conversationStatus === 'pending' && (
          <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-medium">
            Pending Request
          </span>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div
        className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-4"
        onClick={() => setActiveReactionMsgId(null)}
      >
        {messages.length === 0 ? (
          <div className="text-center text-zinc-500 text-xs py-12">
            No messages yet. Say hi to start the conversation!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender_id === currentUser?.id
            const isPickerOpen = activeReactionMsgId === msg.id

            return (
              <div
                key={msg.id}
                className={`flex flex-col group relative ${isMe ? 'items-end' : 'items-start'}`}
              >
                {/* Reply Bubble Reference */}
                {msg.reply_to && (
                  <div
                    className={`text-[11px] mb-1 px-3 py-1 rounded-lg border flex items-center gap-1.5 max-w-[80%] truncate ${
                      isMe
                        ? 'bg-indigo-950/40 border-indigo-800/40 text-indigo-300'
                        : 'bg-zinc-800/60 border-zinc-700 text-zinc-400'
                    }`}
                  >
                    <Reply className="w-3 h-3 rotate-180" />
                    <span className="truncate">
                      <b>{msg.reply_to.sender_id === currentUser?.id ? 'You' : otherUser?.username}:</b>{' '}
                      {msg.reply_to.content}
                    </span>
                  </div>
                )}

                {/* Message Bubble + Action Buttons */}
                <div className="relative flex items-center gap-1.5 max-w-[85%] md:max-w-[70%]">
                  {/* Reaction trigger for user's own messages (left side) */}
                  {isMe && (
                    <div className="hidden group-hover:flex items-center gap-1 text-zinc-400">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveReactionMsgId(isPickerOpen ? null : msg.id)
                        }}
                        className="p-1 hover:text-white"
                        title="React"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 hover:text-white"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Bubble */}
                  <div
                    onDoubleClick={() => toggleReaction(msg.id, '❤️')}
                    className={`rounded-2xl px-3.5 py-2 text-xs sm:text-sm select-text ${
                      isMe
                        ? 'bg-indigo-600 text-white rounded-br-xs'
                        : 'bg-zinc-800 border border-zinc-700/60 text-zinc-100 rounded-bl-xs'
                    }`}
                  >
                    {msg.message_type === 'code' ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 text-[10px] text-indigo-200/80 font-mono uppercase tracking-wider">
                          <Code2 className="w-3 h-3" /> Code Snippet
                        </div>
                        <pre className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 font-mono text-xs overflow-x-auto text-emerald-400">
                          <code>{msg.content}</code>
                        </pre>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                    )}
                  </div>

                  {/* Reaction trigger for other's messages (right side) */}
                  {!isMe && (
                    <div className="hidden group-hover:flex items-center gap-1 text-zinc-400">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setActiveReactionMsgId(isPickerOpen ? null : msg.id)
                        }}
                        className="p-1 hover:text-white"
                        title="React"
                      >
                        <Smile className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setReplyingTo(msg)}
                        className="p-1 hover:text-white"
                        title="Reply"
                      >
                        <Reply className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Floating Instagram-style Emoji Picker */}
                  {isPickerOpen && (
                    <div
                      className={`absolute -top-10 z-30 flex items-center gap-1 bg-zinc-900 border border-zinc-700 px-2 py-1 rounded-full shadow-2xl animate-in fade-in zoom-in-95 ${
                        isMe ? 'right-0' : 'left-0'
                      }`}
                    >
                      {EMOJI_LIST.map((emoji) => (
                        <button
                          key={emoji}
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleReaction(msg.id, emoji)
                          }}
                          className="hover:scale-125 transition-transform p-1 text-sm"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Reactions badge display */}
                {msg.reactions && msg.reactions.length > 0 && (
                  <div
                    className={`flex items-center gap-1 mt-1 ${
                      isMe ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {Array.from(new Set(msg.reactions.map((r) => r.emoji))).map((emoji) => {
                      const count = msg.reactions?.filter((r) => r.emoji === emoji).length
                      const hasReacted = msg.reactions?.some(
                        (r) => r.emoji === emoji && r.user_id === currentUser?.id
                      )
                      return (
                        <button
                          key={emoji}
                          onClick={() => toggleReaction(msg.id, emoji)}
                          className={`text-[11px] px-1.5 py-0.5 rounded-full border flex items-center gap-1 transition-colors ${
                            hasReacted
                              ? 'bg-indigo-600/30 border-indigo-500 text-white'
                              : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                          }`}
                        >
                          <span>{emoji}</span>
                          {count && count > 1 ? <span>{count}</span> : null}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* Timestamp and is_read Indicator */}
                <div className="flex items-center gap-1 text-[10px] text-zinc-500 mt-1 px-1">
                  <span>
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {isMe && (
                    <span className={msg.is_read ? 'text-indigo-400 font-medium' : 'text-zinc-500'}>
                      • {msg.is_read ? 'Seen' : 'Sent'}
                    </span>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Composer Input Area */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/50">
        {/* Reply Preview Bar */}
        {replyingTo && (
          <div className="flex items-center justify-between bg-zinc-800/80 border border-zinc-700 px-3 py-1.5 rounded-xl mb-2 text-xs">
            <div className="flex items-center gap-2 truncate">
              <Reply className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="text-zinc-400 truncate">
                Replying to <b>{replyingTo.sender_id === currentUser?.id ? 'yourself' : otherUser?.username}</b>: {replyingTo.content}
              </span>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="p-1 text-zinc-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {isCodeMode && (
          <div className="flex items-center justify-between text-xs text-indigo-400 bg-indigo-950/40 border border-indigo-800/40 px-3 py-1 rounded-lg mb-2">
            <span className="flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" /> Code Snippet Mode
            </span>
            <button
              type="button"
              onClick={() => setIsCodeMode(false)}
              className="text-zinc-400 hover:text-white text-[11px]"
            >
              Cancel
            </button>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setIsCodeMode(!isCodeMode)}
            className={`p-2.5 rounded-xl border transition-colors ${
              isCodeMode
                ? 'bg-indigo-600/20 border-indigo-500 text-indigo-400'
                : 'bg-zinc-800 border-zinc-700 text-zinc-400 hover:text-white'
            }`}
            title="Toggle Code Snippet"
          >
            <Code2 className="w-4 h-4" />
          </button>

          {isCodeMode ? (
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or write your code..."
              rows={3}
              className="flex-1 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 placeholder-zinc-500 focus:outline-none focus:border-indigo-500 resize-none"
            />
          ) : (
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-zinc-800/80 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
            />
          )}

          <button
            type="submit"
            disabled={!inputText.trim() || sending}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white transition-colors"
          >
            {sending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}