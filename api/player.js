import { methodNotAllowed, readJsonBody, sendJson, toPublicError } from '../server/leaderboard/http.js';
import { validateNickname } from '../server/leaderboard/nickname.js';
import { getSupabaseClient } from '../server/leaderboard/supabase.js';

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    methodNotAllowed(response, ['POST']);
    return;
  }

  try {
    const body = await readJsonBody(request);
    const validation = validateNickname(body.nickname);

    if (!validation.ok) {
      sendJson(response, 400, { error: 'invalid_nickname', message: validation.message });
      return;
    }

    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .select('nickname,best_score,best_rank,round_scores,improved_at')
      .eq('nickname_key', validation.nicknameKey)
      .maybeSingle();

    if (error) {
      throw error;
    }

    sendJson(response, 200, {
      player: {
        nickname: data?.nickname ?? validation.nickname,
        nicknameKey: validation.nicknameKey,
        exists: Boolean(data),
        bestScore: data?.best_score ?? null,
        bestRank: data?.best_rank ?? null,
        roundScores: data?.round_scores ?? null,
        improvedAt: data?.improved_at ?? null,
      },
    });
  } catch (error) {
    const publicError = toPublicError(error);
    sendJson(response, publicError.statusCode, publicError.payload);
  }
}
