const MIN_LENGTH = 2;
const MAX_LENGTH = 20;
const ALLOWED_NICKNAME_PATTERN = /^[\p{L}\p{N} _-]+$/u;
const URL_PATTERN = /(https?:\/\/|www\.|[a-zа-яё0-9-]+\.(ru|рф|com|net|org|app|io|dev|site)\b)/iu;

const CYRILLIC_LOOKALIKES = new Map([
  ['a', 'а'],
  ['e', 'е'],
  ['o', 'о'],
  ['p', 'р'],
  ['c', 'с'],
  ['x', 'х'],
  ['y', 'у'],
  ['k', 'к'],
  ['m', 'м'],
  ['h', 'н'],
  ['b', 'в'],
  ['t', 'т'],
  ['0', 'о'],
  ['3', 'з'],
  ['4', 'а'],
  ['6', 'б'],
  ['@', 'а'],
]);

const BAD_CYRILLIC_ROOTS = [
  'бля',
  'еб',
  'еба',
  'еби',
  'ебу',
  'ёб',
  'пизд',
  'хуй',
  'хуе',
  'хуи',
  'сука',
  'суч',
  'муд',
  'залуп',
  'гандон',
  'гондон',
];

const BAD_TRANSLIT_ROOTS = [
  'blya',
  'blia',
  'suka',
  'such',
  'huy',
  'hui',
  'xuy',
  'pizd',
  'eb',
  'yeb',
  'mud',
  'zalup',
  'gandon',
  'gondon',
];

function publicValidationError() {
  return {
    ok: false,
    message: 'Ник не прошёл проверку. Один мат — 70 лет ада 😅 Попробуй другой псевдоним.',
  };
}

function normalizeProfanityInput(value) {
  const lowered = value
    .toLowerCase()
    .replaceAll('ё', 'е')
    .split('')
    .map((char) => CYRILLIC_LOOKALIKES.get(char) ?? char)
    .join('');

  return lowered
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .replace(/(.)\1{2,}/gu, '$1$1');
}

function normalizeTranslitInput(value) {
  return value
    .toLowerCase()
    .replaceAll('0', 'o')
    .replaceAll('3', 'z')
    .replaceAll('4', 'a')
    .replace(/[^\p{L}\p{N}]+/gu, '')
    .replace(/(.)\1{2,}/gu, '$1$1');
}

export function validateNickname(value) {
  const nickname = String(value ?? '').trim().replace(/\s+/g, ' ');

  if (nickname.length < MIN_LENGTH || nickname.length > MAX_LENGTH) {
    return {
      ok: false,
      message: `Ник должен быть от ${MIN_LENGTH} до ${MAX_LENGTH} символов.`,
    };
  }

  if (URL_PATTERN.test(nickname)) {
    return {
      ok: false,
      message: 'Ник не должен быть ссылкой или рекламой. Попробуй другой псевдоним.',
    };
  }

  if (!ALLOWED_NICKNAME_PATTERN.test(nickname)) {
    return {
      ok: false,
      message: 'Используй в нике буквы, цифры, пробел, дефис или подчёркивание.',
    };
  }

  const profanityKey = normalizeProfanityInput(nickname);
  const translitKey = normalizeTranslitInput(nickname);
  const hasBadWord =
    BAD_CYRILLIC_ROOTS.some((root) => profanityKey.includes(root)) ||
    BAD_TRANSLIT_ROOTS.some((root) => translitKey.includes(root));

  if (hasBadWord) {
    return publicValidationError();
  }

  return {
    ok: true,
    nickname,
    nicknameKey: nickname.toLocaleLowerCase('ru-RU'),
  };
}
