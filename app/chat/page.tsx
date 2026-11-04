import { MessageSquareDashed } from 'lucide-react'

export default function ChatIndexPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-500">
      <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-zinc-400">
        <MessageSquareDashed className="w-7 h-7" />
      </div>
      <h3 className="text-base font-semibold text-zinc-300 mb-1">No conversation selected</h3>
      <p className="text-xs text-zinc-500 max-w-sm">
        Select a chat from the left sidebar or search for a friends to start messaging.
      </p>
    </div>
  )
}