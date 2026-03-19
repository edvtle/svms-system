import { getAuditHeaders } from './auditHeaders';

/**
 * Optimized fetch with timeout, retry, and error handling
 * @param {string} url - API endpoint
 * @param {Object} options - Fetch options (method, body, etc.)
 * @param {number} timeoutMs - Request timeout in milliseconds (default 10000)
 * @param {number} maxRetries - Maximum retry attempts (default 2)
 * @returns {Promise<{status: string, data: any, error?: string}>}
 */
export const fetchWithTimeout = async (
  url,
  options = {},
  timeoutMs = 10000,
  maxRetries = 2
) => {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const fetchOptions = {
        ...options,
        signal: controller.signal,
        headers: {
          ...(options.headers || {}),
          ...getAuditHeaders(),
        },
      };

      const response = await fetch(url, fetchOptions);
      clearTimeout(timeoutId);

      // Try to parse JSON, with fallback
      let data = {};
      try {
        data = await response.json();
      } catch (e) {
        // If JSON parsing fails, try to continue with empty data
        console.warn(`Failed to parse JSON from ${url}:`, e.message);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
      }

      if (!response.ok) {
        const errorMsg = data?.message || `HTTP ${response.status}: ${response.statusText}`;
        throw new Error(errorMsg);
      }

      return {
        status: 'ok',
        data,
      };
    } catch (error) {
      lastError = error;

      // Check if it's a timeout error
      if (error.name === 'AbortError') {
        lastError = new Error('Request timeout - server is taking too long to respond');
      }

      // Don't retry on network errors beyond retries
      if (attempt < maxRetries) {
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, Math.pow(2, attempt) * 500));
        continue;
      }
    }
  }

  return {
    status: 'error',
    data: null,
    error: lastError?.message || 'Failed to fetch data',
  };
};

/**
 * Fetch multiple endpoints in parallel with individual error handling
 * @param {Array<{url: string, key: string, options?: Object}>} requests
 * @returns {Promise<Object>} Results keyed by request key
 */
export const fetchMultiple = async (requests) => {
  const promises = requests.map((req) =>
    fetchWithTimeout(req.url, req.options || {}).then((result) => ({
      key: req.key,
      ...result,
    }))
  );

  const results = await Promise.all(promises);
  const output = {};

  results.forEach((result) => {
    output[result.key] = {
      status: result.status,
      data: result.data,
      error: result.error,
    };
  });

  return output;
};
