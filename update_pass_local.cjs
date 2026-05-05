const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'http://localhost:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1sb2NhbCIsInJlZiI6InRleGFjb3JlLWxvY2FsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NzIzNDUzNSwiZXhwIjoyMDkyNTk0NTM1fQ.8iGFw0gctL08j8y64qadPceHOR2I0GSGCPg69UJ81gs',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function run() {
  const email = 'admin@62c439a7-e3b8-4a2b-96b2-0406b7ebcbd2.local';
  const password = '123456';
  
  console.log(`Setting password for ${email} on LOCAL DOCKER ...`);

  const { data: listData } = await supabase.auth.admin.listUsers();
  const existing = listData?.users?.find(u => u.email === email);
  
  if (existing) {
    console.log('User found! Updating password...');
    const { data, error } = await supabase.auth.admin.updateUserById(existing.id, { password });
    if (error) {
        console.error('Failed to update password:', error.message);
    } else {
        console.log('Password updated successfully for ' + email);
    }
  } else {
    console.log('User not found!');
  }
}

run();
