import { check, sleep } from 'k6';
import http from 'k6/http';

export const options = {
  stages: [
    { duration: '5s', target: 10 },
    { duration: '10s', target: 20 },
    { duration: '5s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],
    http_req_failed: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8000';

export default function () {
  // Test Auth Login Endpoint
  const loginRes = http.get(`${BASE_URL}/auth/google/login?type=login`);
  check(loginRes, {
    'login status is 200 or redirect': (r) => r.status === 200 || r.status === 302 || r.status === 307,
  });

  sleep(0.5);
}
