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

  // Verify caller identity
  const token = authHeader.replace('Bearer ', '')
  const { data: { user: caller }, error: authError } = await serviceClient.auth.getUser(token)
  if (authError || !caller) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Check caller is ADMIN
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

  const { name, email, role = 'TECH' } = await req.json()

  // Send invite email — user sets their own password via the link
  const { data: { user }, error: inviteError } = await serviceClient.auth.admin.inviteUserByEmail(email, {
    data: { name },
  })

  if (inviteError || !user) {
    return new Response(JSON.stringify({ error: inviteError?.message ?? 'Failed to invite user' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Set role in app_metadata so RLS policies can read it from the JWT
  await serviceClient.auth.admin.updateUserById(user.id, {
    app_metadata: { role },
  })

  // Mirror into profiles table
  const { data: profile, error: profileError } = await serviceClient
    .from('profiles')
    .insert({ id: user.id, name, email, role })
    .select('id, name, email, role, created_at')
    .single()

  if (profileError) {
    // Roll back auth user if profile insert fails
    await serviceClient.auth.admin.deleteUser(user.id)
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
    status: 201,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})
