export function sendJson(response, statusCode, payload) {
  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
}

export function methodNotAllowed(response, allowedMethods) {
  response.setHeader('Allow', allowedMethods.join(', '));
  sendJson(response, 405, { error: 'method_not_allowed', message: 'Метод не поддерживается.' });
}

export async function readJsonBody(request) {
  const chunks = [];

  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString('utf8');

  if (!raw) {
    return {};
  }

  return JSON.parse(raw);
}

export function toPublicError(error) {
  if (error?.publicMessage && error?.statusCode) {
    return {
      statusCode: error.statusCode,
      payload: {
        error: error.code ?? 'request_failed',
        message: error.publicMessage,
      },
    };
  }

  return {
    statusCode: 500,
    payload: {
      error: 'server_error',
      message: 'Не удалось выполнить запрос. Попробуй ещё раз позже.',
    },
  };
}
