'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { UserRole } from '@/constants/roles'

interface AuthUser {
  id: string
  email: string
  role: UserRole
  full_name: string
  is_active: boolean
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    async function getUser() {
      const { data: { user: authUser } } = await supabase.auth.getUser()

      if (!authUser) {
        setUser(null)
        setLoading(false)
        return
      }

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, full_name, email, is_active')
        .eq('user_id', authUser.id)
        .single()

      if (profile) {
        setUser({
          id: authUser.id,
          email: profile.email,
          role: profile.role,
          full_name: profile.full_name,
          is_active: profile.is_active,
        })
      }

      setLoading(false)
    }

    getUser()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      getUser()
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return { user, loading, signOut }
}