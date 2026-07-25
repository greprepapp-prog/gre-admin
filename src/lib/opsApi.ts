import { supabase } from './supabase'

export interface FeatureFlag {
  id: string
  flag_key: string
  description: string | null
  is_enabled: boolean
  variant_config: Record<string, unknown>
  updated_at: string
}

export type BannerType = 'info' | 'warning' | 'promo'

export interface AppAnnouncement {
  id: string
  title: string
  message: string
  banner_type: BannerType
  is_active: boolean
  target_segment: string | null
  created_at: string
}

export type BroadcastSegment = 'all' | 'free' | 'active_trial' | 'inactive_7d'

export async function listFeatureFlags(): Promise<FeatureFlag[]> {
  const { data, error } = await supabase.from('feature_flags').select('*').order('flag_key')
  if (error) throw new Error(error.message)
  return (data ?? []) as FeatureFlag[]
}

export interface UpsertFeatureFlagInput {
  id?: string
  flag_key: string
  description: string | null
  is_enabled: boolean
  variant_config: Record<string, unknown>
}

export async function upsertFeatureFlag(input: UpsertFeatureFlagInput): Promise<void> {
  const { error } = await supabase.from('feature_flags').upsert(
    {
      id: input.id,
      flag_key: input.flag_key,
      description: input.description,
      is_enabled: input.is_enabled,
      variant_config: input.variant_config,
    },
    { onConflict: 'flag_key' },
  )
  if (error) throw new Error(error.message)
}

export async function deleteFeatureFlag(id: string): Promise<void> {
  const { error } = await supabase.from('feature_flags').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export async function listAnnouncements(): Promise<AppAnnouncement[]> {
  const { data, error } = await supabase
    .from('app_announcements')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []) as AppAnnouncement[]
}

export interface CreateAnnouncementInput {
  title: string
  message: string
  banner_type: BannerType
  is_active: boolean
  target_segment: string | null
}

export async function createAnnouncement(input: CreateAnnouncementInput): Promise<void> {
  const { error } = await supabase.from('app_announcements').insert(input)
  if (error) throw new Error(error.message)
}

export async function updateAnnouncement(id: string, patch: Partial<CreateAnnouncementInput>): Promise<void> {
  const { error } = await supabase.from('app_announcements').update(patch).eq('id', id)
  if (error) throw new Error(error.message)
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('app_announcements').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

export interface BroadcastInput {
  segment: BroadcastSegment
  title: string
  body: string
  type: string
  link: string | null
}

export async function broadcastNotification(input: BroadcastInput): Promise<{ recipient_count: number }> {
  const { data, error } = await supabase.rpc('admin_broadcast_notification', {
    p_segment: input.segment,
    p_title: input.title,
    p_body: input.body,
    p_type: input.type,
    p_link: input.link,
  })
  if (error) throw new Error(error.message)
  return data
}
