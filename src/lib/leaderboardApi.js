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
  return requestJson(`/api/leaderboard?limit=${limit}`);
}

export async function ensurePlayer(nickname) {
  return requestJson('/api/player', {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });
}

export async function submitLeaderboardResult({ nickname, totalScore, roundScores }) {
  return requestJson('/api/result', {
    method: 'POST',
    body: JSON.stringify({ nickname, totalScore, roundScores }),
  });
}
