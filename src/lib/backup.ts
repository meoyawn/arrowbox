export function dumpStorage(): string {
  const len = localStorage.length
  const ret: Record<string, unknown> = {}

  for (let i = 0; i < len; i++) {
    const k = localStorage.key(i)
    if (!k) continue

    const v = localStorage.getItem(k)
    if (!v) continue

    try {
      ret[k] = JSON.parse(v)
    } catch {
      ret[k] = v
    }
  }

  return JSON.stringify(ret)
}

export function loadStorage(s: string): void {
  const data = JSON.parse(s) as Record<string, unknown>
  for (const k in data) {
    localStorage.setItem(k, JSON.stringify(data[k]))
  }
}
