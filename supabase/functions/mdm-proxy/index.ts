import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// MeshCentral API Helper
class MeshCentralAPI {
  baseUrl: string;
  user: string;
  pass: string;
  token: string | null = null;

  constructor(baseUrl: string, user: string, pass: string) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.user = user;
    this.pass = pass;
  }

  async login() {
    // Note: MeshCentral REST API uses a specific login endpoint.
    // We will implement the exact payload based on standard MeshCentral specs.
    // For now, this is a placeholder structure.
    try {
      const res = await fetch(`${this.baseUrl}/control/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ u: this.user, p: this.pass })
      });
      // Handle cookie or token depending on MC configuration
      const cookie = res.headers.get('set-cookie');
      this.token = cookie; // simplified
      return true;
    } catch (e) {
      console.error("MeshCentral login failed:", e);
      return false;
    }
  }

  async getDevices() {
    // This is a placeholder for the actual MC get devices call
    // Usually /api/v1/devices or similar
    // Returning mock data for the initial proxy setup to ensure ERP connection works first
    return [
      {
        id: 'node-1234',
        name: 'CEO-Laptop',
        os: 'Windows 11',
        state: 1, // 1 = online
        meshid: 'tenant_NextRevolution_id'
      },
      {
        id: 'node-5678',
        name: 'Warehouse-Tablet',
        os: 'Android',
        state: 1,
        meshid: 'tenant_NextRevolution_id'
      },
      {
        id: 'node-9999',
        name: 'HR-iMac',
        os: 'macOS',
        state: 0, // 0 = offline
        meshid: 'tenant_TexaCore_id'
      }
    ];
  }
}

serve(async (req) => {
  // CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Authenticate Request via Supabase JWT
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const authHeader = req.headers.get('Authorization')!;
    
    if (!authHeader) {
      throw new Error('Missing Authorization header');
    }

    const supabaseClient = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');
    
    // 2. Get User's Company ID & Role for Tenant Filtering
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile) throw new Error('Profile not found');

    const isSuperAdmin = profile.role === 'super_admin';
    const companyId = profile.company_id;

    // 3. Connect to MeshCentral
    const mcUrl = Deno.env.get('MESHCENTRAL_URL') || 'https://153.92.222.17';
    const mcUser = Deno.env.get('MESHCENTRAL_USER') || 'feras1960@gmail.com';
    const mcPass = Deno.env.get('MESHCENTRAL_PASS') || 'bF8ayJJuFw';

    const mcApi = new MeshCentralAPI(mcUrl, mcUser, mcPass);
    // await mcApi.login(); // Will be enabled when real WS/REST payload is implemented

    // 4. Handle Actions
    const { action, payload } = await req.json().catch(() => ({ action: 'get_devices', payload: {} }));

    if (action === 'get_devices') {
      const allDevices = await mcApi.getDevices();
      
      // Tenant Filtering Logic
      // We assume meshid or tags contain the company_id / subdomain
      const filteredDevices = isSuperAdmin 
        ? allDevices // Super Admin sees everything
        : allDevices.filter(d => d.meshid.includes(companyId)); // Company Admin sees only their devices

      return new Response(
        JSON.stringify({ success: true, data: filteredDevices, meta: { isSuperAdmin, companyId } }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'get_share_link') {
      // Placeholder for generating a secure web link for IFrame viewing
      const { nodeId, linkType } = payload; // linkType = 'desktop' | 'terminal' | 'files'
      
      const shareUrl = `${mcUrl}/?p=1&node=${nodeId}&view=${linkType}&share=mock_secure_token_123`;
      
      return new Response(
        JSON.stringify({ success: true, shareUrl }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    throw new Error('Unknown action');

  } catch(error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }), 
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
