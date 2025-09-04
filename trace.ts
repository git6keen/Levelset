const buf: { ts: string; event: string; data?: any }[] = [];
let max = 200;
export function setMax(n: number) { max = n; }
export function logEvent(event: string, data?: any) { buf.push({ ts: new Date().toISOString(), event, data }); if (buf.length > max) buf.splice(0, buf.length - max); }
export function getEvents() { return buf.slice(-max); }
