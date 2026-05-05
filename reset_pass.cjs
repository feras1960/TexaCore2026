const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env' }); // Load .env for VITE_SUPABASE_SERVICE_ROLE_KEY

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const serviceRoleKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error("No service role key found!");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function run() {
  const emailsToCheck = ['admin@texacore.local', 'admin@erp.local', 'admin@system.local', 'feras1960@gmail.com'];
  const newPassword = 'password123'; // Standard password

  for (const email of emailsToCheck) {
    console.log(`\nChecking ${email}...`);
    
    // First, try to list users to find the ID, but it's easier to just use admin API to update by ID
    // We can list all users and find the match
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    
    if (listError) {
      console.error("Error listing users:", listError.message);
      continue;
    }
    
    const user = usersData.users.find(u => u.email === email);
    
    if (user) {
      console.log(`Found user ${email} with ID ${user.id}. Updating password...`);
      const { error: updateError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
        email_confirm: true
      });
      
      if (updateError) {
        console.error(`Failed to update ${email}:`, updateError.message);
      } else {
        console.log(`✅ Successfully updated password for ${email} to: ${newPassword}`);
      }
    } else {
      console.log(`User ${email} not found in database.`);
    }
  }
}

run();
