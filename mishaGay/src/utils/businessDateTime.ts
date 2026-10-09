/** Server stores Kyrgyzstan wall time in LocalDateTime. Preserve entered wall time;
 * convert timestamps carrying an offset, never just strip their timezone. */
export function businessDateTime(value?: string): string {
  if (value && !/(Z|[+-]\d{2}:\d{2})$/.test(value)) return value;
  const date = value ? new Date(value) : new Date();
  if (!Number.isFinite(date.getTime())) throw new Error('Неверная дата');
  const parts = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Bishkek',
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const part = (name: string) => parts.find(p => p.type === name)!.value;
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}:${part('second')}`;
}
