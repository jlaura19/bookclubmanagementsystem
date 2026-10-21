import { useEffect, useState } from 'react'
import api from './api'
import { applyTheme } from './theme'

let cached = null
const listeners = new Set()

export function publishProfile(user) {
  cached = user
  if (user?.themePreference) applyTheme(user.themePreference)
  listeners.forEach((fn) => fn(user))
}

export function clearProfile() {
  cached = null
  listeners.forEach((fn) => fn(null))
}

export async function loadProfile() {
  const response = await api.get('/profile')
  publishProfile(response.data)
  return response.data
}

export function useProfile() {
  const [profile, setProfile] = useState(cached)
  useEffect(() => {
    listeners.add(setProfile)
    if (!cached) loadProfile().catch(() => {})
    return () => listeners.delete(setProfile)
  }, [])
  return profile
}
