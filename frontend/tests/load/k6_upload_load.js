import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  vus: 5,
  duration: '10s',
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Test Upload Payload Size & Rate Limiting
  const payload = 'A'.repeat(1024 * 10); // 10 KB payload
  const res = http.post(`${BASE_URL}/upload`, payload, {
    headers: {
      'Content-Type': 'text/plain',
      'X-Forwarded-For': `198.51.100.${Math.floor(Math.random() * 200)}`,
    },
  });

  check(res, {
    'upload response received': (r) => [200, 401, 413, 429].includes(r.status),
  });

  sleep(0.5);
}
