import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    const error = new Error('Supabase environment variables are missing.');
    error.statusCode = 503;
    error.code = 'leaderboard_not_configured';
    error.publicMessage = 'Таблица лидеров пока не настроена. Играть можно, но рейтинг временно недоступен.';
    throw error;
  }

  return { url, key };
}

export function getSupabaseClient() {
  if (cachedClient) {
    return cachedClient;
  }

  const { url, key } = getSupabaseConfig();

  cachedClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  return cachedClient;
}
