import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '10s', target: 50 }, // ramp up to 50 users
    { duration: '30s', target: 50 },  // stay at 50
    { duration: '10s', target: 0 },  // ramp down to 0 users
  ],
};

const userIds = ['load_user_1', 'load_user_2', 'load_user_3', 'load_user_4'];
const categories = ['misc_net', 'grocery_pos', 'entertainment', 'shopping_pos'];

export default function () {
  const userId = userIds[Math.floor(Math.random() * userIds.length)];
  const isFraud = Math.random() > 0.9;
  
  const payload = JSON.stringify({
    userId: userId,
    amount: isFraud ? (Math.random() * 5000 + 500) : (Math.random() * 100 + 1),
    lat: 40.7128 + (Math.random() * 0.1 - 0.05),
    lon: -74.0060 + (Math.random() * 0.1 - 0.05),
    distance_from_home: isFraud ? (Math.random() * 1000 + 50) : (Math.random() * 20),
    repeat_retailer: Math.random() > 0.5 ? 1 : 0,
    used_chip: Math.random() > 0.5 ? 1 : 0,
    used_pin_number: Math.random() > 0.8 ? 1 : 0,
    online_order: Math.random() > 0.4 ? 1 : 0,
    category: categories[Math.floor(Math.random() * categories.length)]
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
  };

  // We use host.docker.internal to target the host machine's port 4000
  // If running k6 natively, you could change this to localhost
  const res = http.post('http://host.docker.internal:4000/transaction', payload, params);

  check(res, {
    'status is 200': (r) => r.status === 200,
  });

  sleep(0.1);
}
