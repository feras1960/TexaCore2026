const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

const channel = supabase.channel('pbx_visitors', {
  config: { presence: { key: 'test-uuid' } }
});

channel.on('presence', { event: 'sync' }, () => {
  console.log('Presence state:', channel.presenceState());
});

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    console.log('Subscribed! Tracking presence...');
    await channel.track({
      uuid: 'test-uuid',
      status: 'online',
      url: '/test-page',
      timestamp: new Date().toISOString()
    });
  }
});
