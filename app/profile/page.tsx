'use client'

import { useState, useEffect, useTransition } from 'react'
import { createClient } from '@/utils/supabase/client'
import { updateProfile } from './actions'
import { Camera, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import type { Profile } from '@/types/database'

export default function ProfilePage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [avatarUrl, setAvatarUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (data) {
        setProfile(data)
        setAvatarUrl(data.avatar_url || '')
      }
      setLoading(false)
    }

    loadProfile()
  }, [])

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const filePath = `${profile.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true })

    if (uploadError) {
      alert(`Upload failed: ${uploadError.message}`)
      setUploading(false)
      return
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath)

    // Add timestamp cache-buster so new image displays immediately
    const fullUrl = `${publicUrl}?t=${Date.now()}`
    setAvatarUrl(fullUrl)
    setUploading(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-400">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-8 flex items-center justify-center">
      <div className="w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl p-6 md:p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/chat"
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold">Edit Profile</h1>
            <p className="text-xs text-zinc-400">Update your avatar, name, and bio</p>
          </div>
        </div>

        {/* Avatar Upload */}
        <div className="flex flex-col items-center gap-3 mb-6">
          <div className="relative group w-24 h-24 rounded-full overflow-hidden bg-zinc-800 border-2 border-zinc-700 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-2xl font-bold uppercase text-zinc-500">
                {profile?.username?.slice(0, 2) || 'U'}
              </span>
            )}

            <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white">
              <Camera className="w-5 h-5 mb-1" />
              <span className="text-[10px] font-medium">
                {uploading ? 'Uploading...' : 'Change'}
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </label>
          </div>
          <span className="text-xs text-zinc-500">@{profile?.username}</span>
        </div>

        <form
          action={(formData) => {
            formData.append('avatar_url', avatarUrl)
            startTransition(() => {
              updateProfile(formData)
            })
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Full Name
            </label>
            <input
              name="full_name"
              type="text"
              defaultValue={profile?.full_name || ''}
              placeholder="e.g. Vishal Khansole"
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1">
              Bio
            </label>
            <textarea
              name="bio"
              rows={3}
              defaultValue={profile?.bio || ''}
              placeholder="Tell others what you study or build..."
              className="w-full px-3.5 py-2.5 rounded-lg bg-zinc-800/80 border border-zinc-700 text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors text-sm resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={isPending || uploading}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium rounded-lg transition-colors text-sm shadow-md flex items-center justify-center gap-2 mt-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save & Continue to Chat
          </button>
        </form>
      </div>
    </div>
  )
}