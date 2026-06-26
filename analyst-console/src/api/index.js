/**
 * @module api
 * @description API client module for the Analyst Console.
 * - Environment-based API URL
 * - Token stored in sessionStorage (survives page refresh)
 * - 401 retry with fresh token
 */
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:4000';

/**
 * Get or refresh the authentication token.
 * Token is cached in sessionStorage to survive page refreshes.
 */
const getToken = async () => {
  let token = sessionStorage.getItem('auth_token');
  if (token) return token;

  const res = await fetch(`${API_URL}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: 'admin',
      password: 'admin123'
    })
  });

  if (!res.ok) throw new Error('Authentication failed');
  const data = await res.json();
  sessionStorage.setItem('auth_token', data.token);
  return data.token;
};

/**
 * Clear cached token (on 401 responses).
 */
const clearToken = () => {
  sessionStorage.removeItem('auth_token');
};

/**
 * Authenticated fetch wrapper with automatic 401 retry.
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @returns {Promise<Response>}
 */
const authenticatedFetch = async (url, options = {}) => {
  const token = await getToken();
  options.headers = {
    ...options.headers,
    'Authorization': `Bearer ${token}`,
  };

  let response = await fetch(url, options);

  // If 401, clear token and retry once with fresh token
  if (response.status === 401) {
    clearToken();
    const newToken = await getToken();
    options.headers['Authorization'] = `Bearer ${newToken}`;
    response = await fetch(url, options);
  }

  return response;
};

export const fetchFlaggedTransactions = async () => {
  const response = await fetch(`${API_URL}/transactions/flagged`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
};

export const reviewTransaction = async (id, newStatus) => {
  const response = await authenticatedFetch(`${API_URL}/transactions/${id}/review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newStatus })
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
};

export const fetchStats = async () => {
  const response = await fetch(`${API_URL}/transactions/stats`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
};

export const fetchAllTransactions = async (filters = {}) => {
  const query = new URLSearchParams(filters).toString();
  const response = await fetch(`${API_URL}/transactions/all?${query}`);
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  const data = await response.json();
  // Support both paginated response { data: [...], pagination } and array response
  return Array.isArray(data) ? data : (data.data || data);
};

export const bulkReviewTransactions = async (ids, newStatus) => {
  const response = await authenticatedFetch(`${API_URL}/transactions/bulk-review`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids, newStatus })
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
};

export const generateTransaction = async (payload) => {
  const response = await fetch(`${API_URL}/transaction`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
  return await response.json();
};