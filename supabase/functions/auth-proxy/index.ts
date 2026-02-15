import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3"

console.log("Auth Proxy Function Up!")

serve(async (req) => {
  const origin = req.headers.get('Origin') ?? '*';
  const incoming = req.headers.get('access-control-request-headers') ?? '';
  
  const corsHeaders = {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': incoming,
    'Access-Control-Allow-Credentials': 'true'
  };

  // Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, email, password, code, type, data: userData } = await req.json()
    
    // Create Supabase client with Service Role Key to bypass RLS and use Admin API
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // --- Action: SEND OTP ---
    if (action === 'send-otp') {
      if (!email || !type) throw new Error('Email and type are required')
      
      // Generate 6-digit code
      const otp = Math.floor(100000 + Math.random() * 900000).toString()
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000) // 10 mins expiry

      // Store in DB
      const { error: dbError } = await supabaseAdmin
        .from('verification_codes')
        .insert({
          email,
          code: otp,
          type,
          expires_at: expiresAt.toISOString()
        })

      if (dbError) throw dbError

      // MOCK: Return the code to the client for display
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'OTP generated', 
          mockCode: otp // REMOVE THIS IN PRODUCTION
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // --- Action: VERIFY OTP ---
    if (action === 'verify-otp') {
      if (!email || !code || !type) throw new Error('Email, code, and type are required')

      // Verify Code
      const { data: records, error: fetchError } = await supabaseAdmin
        .from('verification_codes')
        .select('*')
        .eq('email', email)
        .eq('type', type)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)

      if (fetchError) throw fetchError
      if (!records || records.length === 0) {
        return new Response(
          JSON.stringify({ error: 'Invalid or expired OTP' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
      }

      // Code is valid, proceed with Auth Action
      let result = {}

      if (type === 'signup') {
        if (!password) throw new Error('Password required for signup')
        
        // 1. Create User (Auto Confirm)
        const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: userData || {}
        })

        if (createError) {
           throw createError
        }

        // 2. Sign In to get session
        const { data: sessionData, error: signInError } = await supabaseAdmin.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) throw signInError
        result = sessionData
      } 
      else if (type === 'reset') {
        if (!password) throw new Error('New password required')

        // 1. Get User ID using RPC (accesses auth.users securely)
        const { data: userId, error: userError } = await supabaseAdmin
          .rpc('get_user_id_by_email', { email_input: email })
          
        if (userError) throw userError
        if (!userId) throw new Error('User not found')
        
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
          userId,
          { password: password }
        )
        
        if (updateError) throw updateError
        
        // Return success immediately. Client will handle sign in.
        result = { message: 'Password updated successfully' }
      }

      // Cleanup used code
      await supabaseAdmin
        .from('verification_codes')
        .delete()
        .eq('id', records[0].id)

      return new Response(
        JSON.stringify({ success: true, ...result }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
