import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const serviceClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { data: callerProfile } = await serviceClient
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'ADMIN') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const { id, name, email, password, role } = await req.json()

  // Update auth user fields
  const authUpdate: Record<string, unknown> = {}
  if (email) authUpdate.email = email
  if (password) authUpdate.password = password
  if (role) authUpdate.app_metadata = { role }
  if (name) authUpdate.user_metadata = { name }

  if (Object.keys(authUpdate).length > 0) {
    const { error: updateError } = await serviceClient.auth.admin.updateUserById(id, authUpdate)
    if (updateError) {
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  // Update profile
  const profileUpdate: Record<string, unknown> = {}
  if (name) profileUpdate.name = name
  if (email) profileUpdate.email = email
  if (role) profileUpdate.role = role

  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .update(profileUpdate)
    .eq('id', id)
    .select('id, name, email, role, created_at')
    .single()

  if (profileError) {
    return new Response(JSON.stringify({ error: profileError.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const result = {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role,
    createdAt: profile.created_at,
  }

  return new Response(JSON.stringify(result), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
