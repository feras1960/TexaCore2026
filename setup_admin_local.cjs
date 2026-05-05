const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const email = 'admin@texacore.local';
  const password = '123456';
  
  console.log(`Setting up ${email} on LOCAL DOCKER ...`);

  // First, check if user exists and delete it if it does because our SQL insert corrupted it (no identities)
  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === email);
  if (existing) {
    console.log('Deleting corrupted user...');
    await supabase.auth.admin.deleteUser(existing.id);
  }

  console.log('Creating clean user...');
  const { data: createData, error: createError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: 'System Admin' }
  });
  
  if (createError) {
    console.error('Error creating user:', createError);
    return;
  }
  
  const userId = createData.user.id;
  console.log(`User created with ID: ${userId}`);

  console.log('Assigning super_admin role...');
  const { data: role } = await supabase.from('roles').select('id').eq('code', 'super_admin').single();
  if (role) {
    await supabase.from('user_roles').upsert({
      user_id: userId,
      role_id: role.id,
      is_active: true
    }, { onConflict: 'user_id,role_id' });
  }

  // Check if profile exists, if not insert
  const { data: profile } = await supabase.from('user_profiles').select('id').eq('id', userId).single();
  if (!profile) {
      await supabase.from('user_profiles').insert({
          id: userId,
          email: email,
          full_name: 'System Admin',
          status: 'active'
      }).catch(e => console.log('Profile insert ignored', e.message));
  }

  console.log('✅ Setup complete! You can now login locally with username: admin and password:', password);
}

run();
