import {
  INSTANCE_REQUESTS,
  PER_IP_REQUESTS,
  RATE_WINDOW_MS,
} from "./config.js";

export function createThrottle() {
  // Ephemeral IP counts only, never logged or persisted. Not distributed abuse
  // protection: instances/restarts reset counts; proxies can obscure client IPs.
  const clients = new Map<string, number>();
  let windowStart = Date.now();
  let total = 0;
  return (ip: string, now = Date.now()): boolean => {
    if (now - windowStart >= RATE_WINDOW_MS) {
      clients.clear();
      total = 0;
      windowStart = now;
    }
    const count = clients.get(ip) ?? 0;
    if (count >= PER_IP_REQUESTS || total >= INSTANCE_REQUESTS) return false;
    clients.set(ip, count + 1);
    total += 1;
    return true;
  };
}
