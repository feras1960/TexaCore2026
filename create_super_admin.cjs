const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzNDUzNSwiZXhwIjoyMDkyNTk0NTM1fQ.8iGFw0gctL08j8y64qadPceHOR2I0GSGCPg69UJ81gs',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const email = 'feras1960@gmail.com';
  const password = 'password123';
  
  console.log(`Creating user ${email} ...`);

  let userId;

  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === email);
  
  if (existing) {
    console.log('User already exists! ID:', existing.id);
    userId = existing.id;
    await supabase.auth.admin.updateUserById(userId, { password });
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { is_super_admin: true }
    });
    if (error) {
        console.error('Failed to create user:', error.message);
        return;
    }
    userId = data.user.id;
    console.log('Created successfully. ID:', userId);
  }

  // Use raw Postgres via an RPC or query? We can't run query directly via js unless we have a pg client.
  // Wait, I can run psql via docker exec after I get the ID.
}

run();
