import { methodNotAllowed, readJsonBody, sendJson, toPublicError } from '../server/leaderboard/http.js';
import { validateNickname } from '../server/leaderboard/nickname.js';
import { getRankTitle } from '../server/leaderboard/ranks.js';
import { getSupabaseClient } from '../server/leaderboard/supabase.js';

function normalizeScore(value) {
  const score = Number(value);
  return Number.isInteger(score) && score >= 20 && score <= 40 ? score : null;
}

function normalizeRoundScores(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value)
      .filter(([roundId, score]) => {
        const id = Number(roundId);
        return Number.isInteger(id) && id >= 1 && id <= 4 && Number.isInteger(score) && score >= 0 && score <= 10;
      })
      .map(([roundId, score]) => [roundId, score]),
  );
}

function toPublicEntry(entry) {
  return {
    nickname: entry.nickname,
    bestScore: entry.best_score,
    bestRank: entry.best_rank,
    roundScores: entry.round_scores,
    improvedAt: entry.improved_at,
  };
}

async function submitViaRpc(supabase, payload) {
  const { data, error } = await supabase.rpc('submit_leaderboard_result', payload).single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

async function readCurrentEntry(supabase, nicknameKey) {
  const { data, error } = await supabase
    .from('leaderboard_entries')
    .select('*')
    .eq('nickname_key', nicknameKey)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function submitViaFallback(supabase, validation, score, rank, roundScores) {
  const current = await readCurrentEntry(supabase, validation.nicknameKey);

  if (!current) {
    const { data, error } = await supabase
      .from('leaderboard_entries')
      .insert({
        nickname: validation.nickname,
        nickname_key: validation.nicknameKey,
        best_score: score,
        best_rank: rank,
        round_scores: roundScores,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return { entry: data, improved: true, previousBestScore: null };
  }

  if (score <= current.best_score) {
    return { entry: current, improved: false, previousBestScore: current.best_score };
  }

  const { data, error } = await supabase
    .from('leaderboard_entries')
    .update({
      nickname: validation.nickname,
      best_score: score,
      best_rank: rank,
      round_scores: roundScores,
      improved_at: new Date().toISOString(),
    })
    .eq('nickname_key', validation.nicknameKey)
    .lt('best_score', score)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  return { entry: data, improved: true, previousBestScore: current.best_score };
}

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    methodNotAllowed(response, ['POST']);
    return;
  }

  try {
    const body = await readJsonBody(request);
    const validation = validateNickname(body.nickname);
    const score = normalizeScore(body.totalScore);

    if (!validation.ok) {
      sendJson(response, 400, { error: 'invalid_nickname', message: validation.message });
      return;
    }

    if (score === null) {
      sendJson(response, 400, { error: 'invalid_score', message: 'Результат должен быть числом от 20 до 40.' });
      return;
    }

    const rank = getRankTitle(score);
    const roundScores = normalizeRoundScores(body.roundScores);
    const supabase = getSupabaseClient();
    const previousEntry = await readCurrentEntry(supabase, validation.nicknameKey);
    const previousBestScore = previousEntry?.best_score ?? null;
    const rpcPayload = {
      p_nickname: validation.nickname,
      p_nickname_key: validation.nicknameKey,
      p_score: score,
      p_rank: rank,
      p_round_scores: roundScores,
    };

    const rpcResult = await submitViaRpc(supabase, rpcPayload);

    if (!rpcResult.error) {
      const entry = rpcResult.data;
      sendJson(response, 200, {
        entry: toPublicEntry(entry),
        improved: previousBestScore === null || score > previousBestScore,
        previousBestScore,
        usedRpc: true,
      });
      return;
    }

    const fallback = await submitViaFallback(supabase, validation, score, rank, roundScores);

    sendJson(response, 200, {
      entry: toPublicEntry(fallback.entry),
      improved: fallback.improved,
      previousBestScore: fallback.previousBestScore,
      usedRpc: false,
    });
  } catch (error) {
    const publicError = toPublicError(error);
    sendJson(response, publicError.statusCode, publicError.payload);
  }
}
