// Deploy with: supabase functions deploy admin-users
//
// Handles privileged user-management actions that require the service-role
// key (listing auth.users, banning/unbanning, granting subscription access).
// The service role key itself is never handled by the caller — it's injected
// by the Supabase platform as an env var at runtime.
//
// Every request must carry the caller's Supabase session JWT (sent
// automatically by supabase-js's `functions.invoke`); the function verifies
// that JWT belongs to a user with role = 'admin' (via the existing
// public.has_role RPC) before doing anything privileged.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const ALLOWED_ORIGINS = new Set([
  'https://neej.gre-movie-vocab.site',
  'http://localhost:5173',
])

function corsHeaders(origin: string | null) {
  return {
    'Access-Control-Allow-Origin': origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://neej.gre-movie-vocab.site',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: unknown, status: number, origin: string | null) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin')

  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders(origin) })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405, origin)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json({ error: 'Missing Authorization header' }, 401, origin)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Scoped to the caller's own JWT, only used to find out who's calling.
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const {
    data: { user: caller },
    error: callerError,
  } = await callerClient.auth.getUser()

  if (callerError || !caller) {
    return json({ error: 'Invalid session' }, 401, origin)
  }

  // Service-role client for privileged operations. Never exposed to the client.
  const admin = createClient(supabaseUrl, serviceRoleKey)

  const { data: isAdmin, error: roleError } = await admin.rpc('has_role', {
    _user_id: caller.id,
    _role: 'admin',
  })

  if (roleError || !isAdmin) {
    return json({ error: 'Forbidden: admin role required' }, 403, origin)
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400, origin)
  }

  const action = body.action

  try {
    if (action === 'list') {
      return json(await listUsers(admin), 200, origin)
    }

    if (action === 'set_ban') {
      const userId = String(body.userId ?? '')
      const banned = Boolean(body.banned)
      if (!userId) return json({ error: 'userId is required' }, 400, origin)
      await setBan(admin, caller.id, userId, banned)
      return json({ ok: true }, 200, origin)
    }

    if (action === 'set_subscription') {
      const userId = String(body.userId ?? '')
      const accessLevel = String(body.accessLevel ?? '')
      if (!userId || !accessLevel) {
        return json({ error: 'userId and accessLevel are required' }, 400, origin)
      }
      await setSubscription(admin, caller.id, userId, {
        accessLevel,
        planType: body.planType ? String(body.planType) : null,
        expiresAt: body.expiresAt ? String(body.expiresAt) : null,
      })
      return json({ ok: true }, 200, origin)
    }

    return json({ error: `Unknown action: ${String(action)}` }, 400, origin)
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Internal error' }, 500, origin)
  }
})

// deno-lint-ignore no-explicit-any
async function listUsers(admin: any) {
  const perPage = 1000
  const usersById = new Map<string, any>()

  for (let page = 1; page <= 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error) throw new Error(error.message)
    for (const u of data.users) usersById.set(u.id, u)
    if (data.users.length < perPage) break
  }

  const ids = Array.from(usersById.keys())
  if (ids.length === 0) return { users: [] }

  const [{ data: profiles }, { data: subs }] = await Promise.all([
    admin.from('profiles').select('id, full_name, account_tier, created_at').in('id', ids),
    admin
      .from('user_subscriptions')
      .select('user_id, access_level, plan_type, expires_at, updated_at')
      .in('user_id', ids),
  ])

  const profileById = new Map((profiles ?? []).map((p: any) => [p.id, p]))
  const subByUserId = new Map((subs ?? []).map((s: any) => [s.user_id, s]))

  const users = ids.map((id) => {
    const u = usersById.get(id)
    const profile = profileById.get(id)
    const sub = subByUserId.get(id)
    const provider = u.app_metadata?.provider ?? u.app_metadata?.providers?.[0] ?? 'email'
    const bannedUntil: string | null = u.banned_until ?? null
    const isBanned = Boolean(bannedUntil) && new Date(bannedUntil).getTime() > Date.now()

    return {
      id,
      email: u.email ?? null,
      provider,
      createdAt: u.created_at,
      isBanned,
      fullName: profile?.full_name ?? null,
      accessLevel: sub?.access_level ?? 'free',
      planType: sub?.plan_type ?? null,
      subscriptionExpiresAt: sub?.expires_at ?? null,
    }
  })

  return { users }
}

// deno-lint-ignore no-explicit-any
async function setBan(admin: any, adminId: string, userId: string, banned: boolean) {
  const { error } = await admin.auth.admin.updateUserById(userId, {
    ban_duration: banned ? '87600h' : 'none',
  })
  if (error) throw new Error(error.message)

  await admin.from('admin_audit_logs').insert({
    admin_id: adminId,
    target_user_id: userId,
    action: banned ? 'suspend_user' : 'unsuspend_user',
    details: {},
  })
}

interface SubscriptionInput {
  accessLevel: string
  planType: string | null
  expiresAt: string | null
}

// deno-lint-ignore no-explicit-any
async function setSubscription(admin: any, adminId: string, userId: string, input: SubscriptionInput) {
  const { error } = await admin.from('user_subscriptions').upsert(
    {
      user_id: userId,
      access_level: input.accessLevel,
      plan_type: input.planType,
      expires_at: input.expiresAt,
      granted_by: adminId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)

  await admin.from('admin_audit_logs').insert({
    admin_id: adminId,
    target_user_id: userId,
    action: 'override_subscription',
    details: input,
  })
}
