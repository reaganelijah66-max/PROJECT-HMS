'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Eye, EyeOff, UserRound, Users, Shield } from 'lucide-react'

type RoleTab = 'patient' | 'staff'

export default function LoginPage() {
  const router = useRouter()
  const [tab, setTab] = useState<RoleTab>('staff')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError('Invalid email or password.')
      setLoading(false)
      return
    }

    if (data.user) {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('user_id', data.user.id)
        .single()

      if (!profile) {
        setError('Account not found. Contact your administrator.')
        setLoading(false)
        return
      }

      const isPatient = profile.role === 'patient'
      if (tab === 'patient' && !isPatient) {
        setError('This is not a patient account. Please select Staff.')
        setLoading(false)
        return
      }
      if (tab === 'staff' && isPatient) {
        setError('This is a patient account. Please select Patient.')
        setLoading(false)
        return
      }

      const roleRoutes: Record<string, string> = {
        patient: '/patient',
        doctor: '/doctor',
        nurse: '/nurse',
        receptionist: '/receptionist',
        pharmacist: '/pharmacist',
        lab_technician: '/lab',
        accountant: '/accountant',
        admin: '/admin',
        super_admin: '/admin',
      }

      router.push(roleRoutes[profile.role] || '/')
      router.refresh()
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#0A1628] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl flex rounded-2xl overflow-hidden shadow-2xl"
        style={{ minHeight: '580px' }}>

        {/* ── Left Panel ── */}
        <div className="hidden md:flex md:w-5/12 flex-col justify-between p-10 relative overflow-hidden"
          style={{ background: 'linear-gradient(160deg, #0E7C6E 0%, #0A5C52 60%, #073D38 100%)' }}>

          {/* Decorative circles */}
          <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)' }} />
          <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)' }} />

          {/* Top: logo */}
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-10">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-lg"
                style={{ background: 'rgba(255,255,255,0.15)', color: '#fff' }}>
                G
              </div>
              <div>
                <p className="text-white font-semibold text-base leading-none">GNP HMS</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Hospital Management System
                </p>
              </div>
            </div>

            <h2 className="text-white text-2xl font-semibold leading-snug">
              Empowering healthcare professionals with actionable data.
            </h2>
            <p className="text-sm mt-3 leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
              Secure, fast, and reliable access to patient records and hospital management tools.
            </p>
          </div>

          {/* Bottom: trust badge */}
          <div className="relative z-10 flex items-center gap-3 rounded-xl px-4 py-3"
            style={{ background: 'rgba(255,255,255,0.08)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(255,255,255,0.12)' }}>
              <Shield className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-white text-xs font-medium">Secure & Encrypted</p>
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>
                End-to-end data protection
              </p>
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex flex-col justify-center bg-white px-8 py-10 md:px-12">

          <h2 className="text-2xl font-semibold text-[#0F172A]">Welcome Back</h2>
          <p className="text-sm text-[#64748B] mt-1 mb-7">
            Please sign in to your account.
          </p>

          {/* Role tabs */}
          <div className="mb-6">
            <p className="text-xs font-medium text-[#64748B] uppercase tracking-wide mb-2">
              Select Role
            </p>
            <div className="grid grid-cols-2 gap-2">
              {([
                { key: 'patient', label: 'Patient', icon: UserRound },
                { key: 'staff', label: 'Staff', icon: Users },
              ] as { key: RoleTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => { setTab(key); setError('') }}
                  className="flex flex-col items-center gap-1.5 py-3 rounded-xl border-2 transition-all"
                  style={{
                    borderColor: tab === key ? '#0E7C6E' : '#E2E8F0',
                    background: tab === key ? '#E6F4F2' : 'transparent',
                    color: tab === key ? '#0E7C6E' : '#64748B',
                  }}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-[#0F172A]">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                placeholder="name@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full h-10 px-3 rounded-lg border text-sm outline-none transition-all"
                style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                onFocus={(e) => e.target.style.borderColor = '#0E7C6E'}
                onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="text-sm font-medium text-[#0F172A]">
                  Password
                </label>
                <button type="button" className="text-xs text-[#0E7C6E] hover:underline">
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full h-10 px-3 pr-10 rounded-lg border text-sm outline-none transition-all"
                  style={{ borderColor: '#E2E8F0', color: '#0F172A' }}
                  onFocus={(e) => e.target.style.borderColor = '#0E7C6E'}
                  onBlur={(e) => e.target.style.borderColor = '#E2E8F0'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: '#94A3B8' }}
                >
                  {showPassword
                    ? <EyeOff className="w-4 h-4" />
                    : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="rounded-lg px-3 py-2.5 text-sm"
                style={{ background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-10 rounded-lg text-sm font-medium text-white transition-all mt-1"
              style={{
                background: loading ? '#64748B' : '#0E7C6E',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-xs text-[#94A3B8] mt-6">
            By signing in, you agree to our{' '}
            <span className="text-[#0E7C6E] cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#0E7C6E] cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  )
}