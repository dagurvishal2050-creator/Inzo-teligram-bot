const TelegramBot = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  if (req.method === 'POST') {
    const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN);
    const { message } = req.body;
    
    if (message && message.text) {
      const chatId = message.chat.id;
      const text = message.text;
      
      // Handle commands
      if (text === '/start') {
        await bot.sendMessage(chatId, 'Welcome to INZO Admin Bot! Use /help to see available commands.');
      } else if (text === '/help') {
        await bot.sendMessage(chatId, 'Available commands:
/pendingrequests - View pending transactions
/maintenancestatus - Check maintenance mode');
      } else if (text === '/pendingrequests') {
        const { data } = await supabase.from('deposits').select('*').eq('status', 'pending');
        await bot.sendMessage(chatId, `Pending deposits: ${data.length}`);
      }
    }
    
    res.status(200).json({ ok: true });
  } else {
    res.status(200).send('Bot is running');
  }
};