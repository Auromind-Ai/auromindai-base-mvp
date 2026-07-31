import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  scenarios: {
    ai_concurrency: {
      executor: 'constant-arrival-rate',
      rate: 10,
      timeUnit: '1s',
      duration: '10s',
      preAllocatedVUs: 5,
      maxVUs: 15,
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.50'], // 429 concurrency limit blocks are expected under load
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  const res = http.get(`${BASE_URL}/brain/chat`, {
    headers: { 'X-Forwarded-For': '198.51.100.99' },
  });

  check(res, {
    'response status is 200, 401, or 429': (r) => [200, 401, 429].includes(r.status),
  });

  sleep(0.2);
}
