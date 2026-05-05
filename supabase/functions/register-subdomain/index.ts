import { serve } from "https://deno.land/std@0.177.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Utility to generate a random 32-byte secret and encode it to Base64
function generateTunnelSecret() {
  const secret = new Uint8Array(32)
  crypto.getRandomValues(secret)
  // Convert to base64
  return btoa(String.fromCharCode.apply(null, Array.from(secret)))
}

serve(async (req) => {
  // CORS configuration
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    })
  }

  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json'
  }

  try {
    const { licenseKey, subdomain, localIp, companyName, machineId } = await req.json()

    if (!subdomain || !licenseKey) {
      return new Response(JSON.stringify({ success: false, error: 'Subdomain and License Key are required' }), { status: 400, headers: corsHeaders })
    }

    // Connect to Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Validate License (Optional placeholder: we can check the licenses table if it exists)
    // For now, we proceed to create the Cloudflare tunnel and log it in Supabase
    
    // Cloudflare Credentials
    const CF_API_TOKEN = Deno.env.get('CF_API_TOKEN') // Using secure API Token now
    const CF_ACCOUNT_ID = Deno.env.get('CF_ACCOUNT_ID')
    const CF_ZONE_ID = Deno.env.get('CF_ZONE_ID')

    if (!CF_API_TOKEN || !CF_ACCOUNT_ID || !CF_ZONE_ID) {
      // Return success true with a mock token if CF credentials are not set (for testing purposes)
      console.warn("Cloudflare credentials not fully set. Returning a mock tunnel.")
      return new Response(JSON.stringify({ 
        success: true, 
        tunnel_token: 'MOCK_TUNNEL_TOKEN_WAITING_FOR_CLOUDFLARE_SECRETS',
        subdomain,
        url: `https://${subdomain}.texacore.ai`
      }), { status: 200, headers: corsHeaders })
    }

    const tunnelSecretBase64 = generateTunnelSecret()
    
    // 2. Create the tunnel in Cloudflare
    const createTunnelRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/cfd_tunnel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name: `desktop-${subdomain}`,
        tunnel_secret: tunnelSecretBase64
      })
    })

    const tunnelData = await createTunnelRes.json()
    if (!tunnelData.success) {
      console.error('Cloudflare Tunnel Error:', tunnelData.errors)
      return new Response(JSON.stringify({ success: false, error: 'Failed to create tunnel in Cloudflare', details: tunnelData.errors }), { status: 500, headers: corsHeaders })
    }

    const tunnelId = tunnelData.result.id

    // 3. Create a DNS CNAME record mapping the subdomain to the tunnel
    const cnameRes = await fetch(`https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'CNAME',
        name: `${subdomain}`, // e.g. "mycompany" (Cloudflare appends .texacore.ai)
        content: `${tunnelId}.cfargotunnel.com`,
        proxied: true,
        comment: `Created by TexaCore Desktop for ${licenseKey}`
      })
    })

    const cnameData = await cnameRes.json()
    if (!cnameData.success) {
      console.error('Cloudflare DNS Error:', cnameData.errors)
      // Note: We might want to rollback the tunnel creation here in a real production system
      return new Response(JSON.stringify({ success: false, error: 'Failed to create DNS record', details: cnameData.errors }), { status: 500, headers: corsHeaders })
    }

    // 3.5. Configure the Tunnel remote routing (Ingress)
    const configRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${CF_ACCOUNT_ID}/cfd_tunnel/${tunnelId}/configurations`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${CF_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        config: {
          ingress: [
            {
              hostname: `${subdomain}.texacore.ai`,
              service: "http://localhost:8080",
              originRequest: {
                noTLSVerify: true
              }
            },
            {
              service: "http_status:404"
            }
          ]
        }
      })
    })

    const configData = await configRes.json()
    if (!configData.success) {
      console.error('Cloudflare Config Error:', configData.errors)
    }


    // 4. Construct the Tunnel Token
    const tokenPayload = {
      a: CF_ACCOUNT_ID,
      t: tunnelId,
      s: tunnelSecretBase64
    }
    const tunnelToken = btoa(JSON.stringify(tokenPayload))

    // 5. Store the tunnel metadata in Supabase (Central Dashboard)
    // We attempt to insert into a 'cloud_tunnels' table. If it doesn't exist, we ignore the error for now.
    const { error: dbError } = await supabase.from('cloud_tunnels').insert({
      license_key: licenseKey,
      subdomain: subdomain,
      tunnel_id: tunnelId,
      company_name: companyName || 'Unknown',
      machine_id: machineId || 'Unknown',
      local_ip: localIp || 'Unknown',
      created_at: new Date().toISOString()
    }).select().single()

    if (dbError) {
      console.warn("Could not save to cloud_tunnels table:", dbError.message)
      // We don't fail the request since the tunnel was actually created in Cloudflare
    }

    return new Response(JSON.stringify({
      success: true,
      tunnel_token: tunnelToken,
      subdomain: subdomain,
      url: `https://${subdomain}.texacore.ai`
    }), { status: 200, headers: corsHeaders })

  } catch (error: any) {
    console.error('Edge Function Error:', error.message)
    return new Response(JSON.stringify({ success: false, error: 'Internal Server Error', details: error.message }), { status: 500, headers: corsHeaders })
  }
})
