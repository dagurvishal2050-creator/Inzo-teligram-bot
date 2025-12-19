// Telegram Webhook Handler for Vercel Serverless Functions
const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const getSupabase = () => {
  return createClient(
    process.env.VITE_SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  );
};

// Helper function to send messages
async function sendMessage(chatId, text) {
  const url = `https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    })
  });
  return response.json();
}

// Main webhook handler
module.exports = async (req, res) => {
  // Handle GET requests (health check)
  if (req.method === 'GET') {
    return res.status(200).json({ 
      status: 'ok', 
      message: 'Telegram webhook is running',
      timestamp: new Date().toISOString()
    });
  }

  // Handle POST requests (Telegram updates)
  if (req.method === 'POST') {
    try {
      const supabase = getSupabase();
      const { message } = req.body;

      // Validate message
      if (!message || !message.text) {
        return res.status(200).json({ ok: true });
      }

      const chatId = message.chat.id;
      const text = message.text.trim();
      const userId = message.from.id;

      // Check if user is admin
      const isAdmin = userId.toString() === process.env.TELEGRAM_ADMIN_ID;

      // Handle commands
      if (text === '/start') {
        await sendMessage(
          chatId,
          '🎉 <b>Welcome to INZO Investment Platform!</b>

' +
          'Use /help to see available commands.'
        );
      } 
      else if (text === '/help') {
        const helpText = isAdmin
          ? '📋 <b>Admin Commands:</b>

' +
            '/pendingrequests - View pending transactions
' +
            '/deposits - View pending deposits
' +
            '/withdrawals - View pending withdrawals
' +
            '/users - View all users
' +
            '/stats - System statistics
' +
            '/maintenancemode - Check maintenance mode'
          : '📋 <b>Available Commands:</b>

' +
            '/start - Welcome message
' +
            '/help - Show this help message';
        
        await sendMessage(chatId, helpText);
      } 
      else if (text === '/pendingrequests') {
        if (!isAdmin) {
          await sendMessage(chatId, '❌ This command is only available for admins.');
          return res.status(200).json({ ok: true });
        }

        const { data: deposits } = await supabase
          .from('deposits')
          .select('*')
          .eq('status', 'pending');
        
        const { data: withdrawals } = await supabase
          .from('withdrawals')
          .select('*')
          .eq('status', 'pending');

        const messageText = 
          `📊 <b>Pending Requests:</b>

` +
          `💰 Deposits: ${deposits?.length || 0}
` +
          `💸 Withdrawals: ${withdrawals?.length || 0}`;

        await sendMessage(chatId, messageText);
      } 
      else if (text === '/deposits') {
        if (!isAdmin) {
          await sendMessage(chatId, '❌ This command is only available for admins.');
          return res.status(200).json({ ok: true });
        }

        const { data } = await supabase
          .from('deposits')
          .select('*, profiles(full_name, phone)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!data || data.length === 0) {
          await sendMessage(chatId, '✅ No pending deposits!');
        } else {
          let messageText = '💰 <b>Pending Deposits:</b>

';
          data.forEach((deposit, index) => {
            messageText += 
              `${index + 1}. <b>${deposit.profiles?.full_name || 'Unknown'}</b>
` +
              `   Amount: ₹${deposit.amount}
` +
              `   UTR: ${deposit.utr_number || 'N/A'}
` +
              `   Phone: ${deposit.profiles?.phone || 'N/A'}

`;
          });
          await sendMessage(chatId, messageText);
        }
      } 
      else if (text === '/withdrawals') {
        if (!isAdmin) {
          await sendMessage(chatId, '❌ This command is only available for admins.');
          return res.status(200).json({ ok: true });
        }

        const { data } = await supabase
          .from('withdrawals')
          .select('*, profiles(full_name, phone)')
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(5);

        if (!data || data.length === 0) {
          await sendMessage(chatId, '✅ No pending withdrawals!');
        } else {
          let messageText = '💸 <b>Pending Withdrawals:</b>

';
          data.forEach((withdrawal, index) => {
            messageText += 
              `${index + 1}. <b>${withdrawal.profiles?.full_name || 'Unknown'}</b>
` +
              `   Amount: ₹${withdrawal.amount}
` +
              `   Bank: ${withdrawal.bank_name || 'N/A'}
` +
              `   Account: ${withdrawal.account_number || 'N/A'}
` +
              `   Phone: ${withdrawal.profiles?.phone || 'N/A'}

`;
          });
          await sendMessage(chatId, messageText);
        }
      } 
      else if (text === '/users') {
        if (!isAdmin) {
          await sendMessage(chatId, '❌ This command is only available for admins.');
          return res.status(200).json({ ok: true });
        }

        const { data, count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact' })
          .order('created_at', { ascending: false })
          .limit(10);

        let messageText = `👥 <b>Total Users: ${count || 0}</b>

`;
        
        if (data && data.length > 0) {
          messageText += '<b>Recent Users:</b>

';
          data.forEach((user, index) => {
            messageText += 
              `${index + 1}. ${user.full_name || 'Unknown'}
` +
              `   Phone: ${user.phone || 'N/A'}
` +
              `   Balance: ₹${user.balance || 0}
` +
              `   Role: ${user.role || 'user'}

`;
          });
        }

        await sendMessage(chatId, messageText);
      } 
      else if (text === '/stats') {
        if (!isAdmin) {
          await sendMessage(chatId, '❌ This command is only available for admins.');
          return res.status(200).json({ ok: true });
        }

        const { count: usersCount } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true });

        const { count: depositsCount } = await supabase
          .from('deposits')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const { count: withdrawalsCount } = await supabase
          .from('withdrawals')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'pending');

        const { count: investmentsCount } = await supabase
          .from('investments')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'active');

        const messageText = 
          `📊 <b>System Statistics:</b>

` +
          `👥 Total Users: ${usersCount || 0}
` +
          `💰 Pending Deposits: ${depositsCount || 0}
` +
          `💸 Pending Withdrawals: ${withdrawalsCount || 0}
` +
          `📈 Active Investments: ${investmentsCount || 0}`;

        await sendMessage(chatId, messageText);
      } 
      else if (text === '/maintenancemode') {
        if (!isAdmin) {
          await sendMessage(chatId, '❌ This command is only available for admins.');
          return res.status(200).json({ ok: true });
        }

        const { data } = await supabase
          .from('admin_settings')
          .select('maintenance_mode')
          .maybeSingle();

        const status = data?.maintenance_mode ? '🔴 ON' : '🟢 OFF';
        await sendMessage(chatId, `🔧 <b>Maintenance Mode:</b> ${status}`);
      } 
      else {
        await sendMessage(
          chatId,
          '❓ Unknown command. Use /help to see available commands.'
        );
      }

      return res.status(200).json({ ok: true });
    } catch (error) {
      console.error('Webhook error:', error);
      return res.status(500).json({ 
        ok: false, 
        error: error.message 
      });
    }
  }

  // Method not allowed
  return res.status(405).json({ 
    error: 'Method not allowed' 
  });
};