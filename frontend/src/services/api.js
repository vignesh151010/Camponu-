/**
 * Centralized API client for CAMPON U.
 * Handles request dispatching, response parsing, and normalized error throwing.
 */

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export async function fetchHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `Server returned HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Unable to connect to the backend server. Please verify the FastAPI service is running.');
    }
    throw error;
  }
}
