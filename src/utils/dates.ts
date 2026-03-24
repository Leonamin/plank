export function getISOWeek(d: Date): { year: number; week: number } {
  const date = new Date(d.getTime())
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7))
  const week1 = new Date(date.getFullYear(), 0, 4)
  const weekNum = 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7)
  return { year: date.getFullYear(), week: weekNum }
}

export function getHalfWeekDates(d: Date): { half: string; range: string } {
  const day = d.getDay() // 0=Sun
  const isFirstHalf = day >= 1 && day <= 3 // Mon~Wed
  const mon = new Date(d)
  mon.setDate(d.getDate() - ((d.getDay() + 6) % 7)) // Monday of this week
  const wed = new Date(mon); wed.setDate(mon.getDate() + 2)
  const thu = new Date(mon); thu.setDate(mon.getDate() + 3)
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
  const fmt = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`
  if (isFirstHalf) return { half: '전반', range: `${fmt(mon)}~${fmt(wed)}` }
  return { half: '후반', range: `${fmt(thu)}~${fmt(sun)}` }
}

export function getDoneGroupKey(dateStr: string | undefined, weekStr: string | undefined, groupBy: string): string {
  if (!dateStr && !weekStr) return 'other'
  if (groupBy === 'week') return weekStr || 'other'
  if (!dateStr) return weekStr || 'other'
  const d = new Date(dateStr + 'T00:00:00')
  if (isNaN(d.getTime())) return weekStr || 'other'
  switch (groupBy) {
    case 'day': return dateStr
    case 'half-week': {
      const { year, week } = getISOWeek(d)
      const { half } = getHalfWeekDates(d)
      const sortKey = half === '전반' ? 'a' : 'b'
      return `${year}-W${String(week).padStart(2, '0')}-${sortKey}-${half}`
    }
    case 'month': return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    default: return weekStr || 'other'
  }
}

export function getDoneGroupLabel(key: string, groupBy: string): string {
  if (key === 'other') return '기타'
  switch (groupBy) {
    case 'day': return key // YYYY-MM-DD
    case 'half-week': {
      // key format: YYYY-Www-sortKey-half
      const parts = key.split('-')
      const weekLabel = `${parts[0]}-${parts[1]}`
      const half = parts[3]
      // Compute date range from week number
      const year = parseInt(parts[0])
      const weekNum = parseInt(parts[1].replace('W', ''))
      const jan4 = new Date(year, 0, 4)
      const mon = new Date(jan4)
      mon.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7) + (weekNum - 1) * 7)
      const fmt = (dt: Date) => `${dt.getMonth() + 1}/${dt.getDate()}`
      if (half === '전반') {
        const wed = new Date(mon); wed.setDate(mon.getDate() + 2)
        return `${weekLabel} 전반 (${fmt(mon)}~${fmt(wed)})`
      } else {
        const thu = new Date(mon); thu.setDate(mon.getDate() + 3)
        const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
        return `${weekLabel} 후반 (${fmt(thu)}~${fmt(sun)})`
      }
    }
    case 'week': return key
    case 'month': {
      const [y, m] = key.split('-')
      return `${y}년 ${parseInt(m)}월`
    }
    default: return key
  }
}
