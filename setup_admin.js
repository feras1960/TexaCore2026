import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const email = 'admin@texacore.local';
  const password = '123456'; // Default standard password
  
  console.log(`Setting up ${email} ...`);

  // 1. Create or update user in auth.users
  let { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
  let user = usersData?.users?.find(u => u.email === email);
  
  if (!user) {
    console.log('Creating user in auth.users...');
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
    user = createData.user;
  } else {
    console.log('User exists in auth.users. Updating password...');
    await supabase.auth.admin.updateUserById(user.id, { password, email_confirm: true });
  }

  const userId = user.id;
  console.log(`User ID: ${userId}`);

  // 2. Insert into user_profiles
  console.log('Checking user_profiles...');
  const { data: profile } = await supabase.from('user_profiles').select('id').eq('id', userId).single();
  
  if (!profile) {
    console.log('Inserting into user_profiles...');
    const { error: profileError } = await supabase.from('user_profiles').insert({
      id: userId,
      email,
      full_name: 'System Admin',
      status: 'active'
    });
    if (profileError) console.error('Error inserting profile:', profileError);
  }

  // 3. Get super_admin role
  console.log('Fetching super_admin role...');
  const { data: role } = await supabase.from('roles').select('id').eq('code', 'super_admin').single();
  
  if (role) {
    console.log('Assigning super_admin role...');
    await supabase.from('user_roles').upsert({
      user_id: userId,
      role_id: role.id,
      is_active: true
    }, { onConflict: 'user_id,role_id' });
  } else {
    console.log('Could not find super_admin role!');
  }

  console.log('✅ Setup complete! You can now login with username: admin and password:', password);
}

run();
