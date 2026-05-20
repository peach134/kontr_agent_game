export const RANKS = [
  { min: 20, max: 25, title: 'Стажёр службы безопасности' },
  { min: 26, max: 33, title: 'Младший риск-аналитик' },
  { min: 34, max: 38, title: 'Комплаенс-специалист' },
  { min: 39, max: 40, title: 'Налоговый Шерлок' },
];

export function getRankTitle(score) {
  return RANKS.find((rank) => score >= rank.min && score <= rank.max)?.title ?? 'Участник игры';
}
