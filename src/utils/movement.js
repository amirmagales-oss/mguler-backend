export function generateMovementNo(prefix = 'MOV') {
  const now = new Date();
  const stamp = now.toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
  const rand = Math.floor(Math.random() * 9000 + 1000);
  return `${prefix}-${stamp}-${rand}`;
}

export function generateGroupKey() {
  return `GRP-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`;
}
