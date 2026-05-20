import { methodNotAllowed, sendJson, toPublicError } from '../server/leaderboard/http.js';
import { getSupabaseClient } from '../server/leaderboard/supabase.js';

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    methodNotAllowed(response, ['GET']);
    return;
  }

  try {
    const url = new URL(request.url, 'http://localhost');
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') ?? 20) || 20));
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('nickname,best_score,best_rank,round_scores,improved_at')
      .order('best_score', { ascending: false })
      .order('improved_at', { ascending: true })
      .order('nickname', { ascending: true })
      .limit(limit);

    if (error) {
      throw error;
    }

    sendJson(response, 200, {
      entries: (data ?? []).map((entry, index) => ({
        place: index + 1,
        nickname: entry.nickname,
        bestScore: entry.best_score,
        bestRank: entry.best_rank,
        roundScores: entry.round_scores,
        improvedAt: entry.improved_at,
      })),
    });
  } catch (error) {
    const publicError = toPublicError(error);
    sendJson(response, publicError.statusCode, publicError.payload);
  }
}
