const isLocalAIStudio = window.location.hostname.includes('run.app') || window.location.port === '3000';
const API_BASE_URL = (import.meta as any).env?.VITE_API_BASE_URL || (isLocalAIStudio ? '/api' : 'http://localhost:3001/api');

export const apiClient = {
  getBaseUrl: () => API_BASE_URL,
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || error.error || 'Errore di rete');
    }
    return response.json();
  },
  
  post: async <T>(endpoint: string, data: any): Promise<T> => {
    const isFormData = data instanceof FormData;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: isFormData ? {} : { 'Content-Type': 'application/json' },
      body: isFormData ? data : JSON.stringify(data),
    });
    
    if (!response.ok) {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
            const error = await response.json();
            throw new Error(error.message || error.error || 'Errore API');
        } else {
             throw new Error('Errore API : ' + response.statusText);
        }
    }
    return response.json();
  }
};
