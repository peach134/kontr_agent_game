async function requestJson(path, options = {}) {
  const response = await fetch(path, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    ...options,
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    const message = payload?.message ?? 'Не удалось связаться с таблицей лидеров.';
    throw new Error(message);
  }

  return payload;
}

export async function getLeaderboard(limit = 20) {
  const payload = await requestJson(`/api/leaderboard?limit=${limit}`);

  return {
    entries: Array.isArray(payload?.entries) ? payload.entries : [],
  };
}

export async function ensurePlayer(nickname) {
  const payload = await requestJson('/api/player', {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });

  if (!payload?.player) {
    throw new Error('Не удалось подготовить псевдоним. Попробуй ещё раз позже.');
  }

  return payload;
}

export async function submitLeaderboardResult({ nickname, totalScore, roundScores }) {
  const payload = await requestJson('/api/result', {
    method: 'POST',
    body: JSON.stringify({ nickname, totalScore, roundScores }),
  });

  if (!payload?.entry) {
    throw new Error('Не удалось обновить таблицу лидеров. Попробуй ещё раз позже.');
  }

  return payload;
}
