class ApplianceHubAPIClient {
  baseURL: string;
  accessToken: string | null = null;
  refreshToken: string | null = null;

  constructor(baseURL = 'http://localhost:3001') {
    this.baseURL = baseURL;
    this.loadTokensFromStorage();
  }

  loadTokensFromStorage() {
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('access_token');
      this.refreshToken = localStorage.getItem('refresh_token');
    }
  }

  saveTokensToStorage(accessToken: string, refreshToken: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
    }
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
    }
    this.accessToken = null;
    this.refreshToken = null;
  }

  async request(endpoint: string, method = 'GET', data?: any, headers: Record<string, string> = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.accessToken) {
      requestHeaders['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const config: RequestInit = {
      method,
      headers: requestHeaders,
    };

    if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
      config.body = JSON.stringify(data);
    }

    const response = await fetch(url, config);

    if (response.status === 401 && this.refreshToken) {
      await this.refreshAccessToken();
      return this.request(endpoint, method, data, headers);
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.message || `API Error: ${response.statusText}`);
    }

    return response.json();
  }

  async uploadFile(endpoint: string, file: File, additionalData?: Record<string, string | number>) {
    const formData = new FormData();
    formData.append('file', file);

    if (additionalData) {
      Object.entries(additionalData).forEach(([key, value]) => {
        formData.append(key, String(value));
      });
    }

    const url = `${this.baseURL}${endpoint}`;
    const headers: Record<string, string> = {};

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed: ${response.statusText}`);
    }

    return response.json();
  }

  async register(data: any) {
    const response = await this.request('/auth/register', 'POST', data);
    if (response.access_token && response.refresh_token) {
      this.saveTokensToStorage(response.access_token, response.refresh_token);
    }
    return response;
  }

  async login(credentials: any) {
    const response = await this.request('/auth/login', 'POST', credentials);
    if (response.access_token && response.refresh_token) {
      this.saveTokensToStorage(response.access_token, response.refresh_token);
    }
    return response;
  }

  async getProfile() {
    return this.request('/auth/me', 'GET');
  }

  async refreshAccessToken() {
    if (!this.refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await this.request('/auth/refresh', 'POST', {
      refresh_token: this.refreshToken,
    });

    if (response.access_token) {
      this.accessToken = response.access_token;
      if (typeof window !== 'undefined') {
        localStorage.setItem('access_token', response.access_token);
      }
    }
  }

  async logout() {
    try {
      await this.request('/auth/logout', 'POST');
    } finally {
      this.clearTokens();
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  getAccessToken() {
    return this.accessToken;
  }

  async getBusinesses(limit = 50, offset = 0) {
    return this.request(`/api/businesses?limit=${limit}&offset=${offset}`, 'GET');
  }

  async getBusiness(businessId: string) {
    return this.request(`/api/businesses/${businessId}`, 'GET');
  }

  async getBusinessStats(businessId: string) {
    return this.request(`/api/businesses/${businessId}/stats`, 'GET');
  }

  async getBusinessUsers(businessId: string) {
    return this.request(`/api/businesses/${businessId}/users`, 'GET');
  }

  async getAppliances(businessId: string, limit = 20, offset = 0) {
    return this.request(`/api/appliances?business_id=${businessId}&limit=${limit}&offset=${offset}`, 'GET');
  }

  async getAppliance(applianceId: string) {
    return this.request(`/api/appliances/${applianceId}`, 'GET');
  }

  async createAppliance(businessId: string, data: any) {
    return this.request(`/api/appliances?business_id=${businessId}`, 'POST', data);
  }

  async updateAppliance(applianceId: string, data: any) {
    return this.request(`/api/appliances/${applianceId}`, 'PUT', data);
  }

  async getDashboardStats(businessId: string) {
    return this.request(`/api/dashboard/stats/${businessId}`, 'GET');
  }

  async getDashboardAppliances(businessId: string, limit = 20, offset = 0, sort = 'created_at') {
    return this.request(`/api/dashboard/appliances/${businessId}?limit=${limit}&offset=${offset}&sort=${sort}`, 'GET');
  }

  async getDashboardSummary(businessId: string) {
    return this.request(`/api/dashboard/summary/${businessId}`, 'GET');
  }

  async getWarrantyStatus(businessId: string) {
    return this.request(`/api/dashboard/warranty-status/${businessId}`, 'GET');
  }

  async getRecentActivity(businessId: string, limit = 50) {
    return this.request(`/api/dashboard/recent-activity/${businessId}?limit=${limit}`, 'GET');
  }

  async uploadDocument(applianceId: string, file: File, documentType = 'document') {
    return this.uploadFile(`/upload/document/${applianceId}?document_type=${documentType}`, file);
  }

  async uploadImage(file: File) {
    return this.uploadFile('/upload/image', file);
  }

  async deleteFile(fileId: string) {
    return this.request(`/upload/${fileId}`, 'DELETE');
  }

  async generateWarrantyPDF(warrantyId: string) {
    const response = await fetch(`${this.baseURL}/pdf/warranty/${warrantyId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async generateClaimPDF(claimId: string) {
    const response = await fetch(`${this.baseURL}/pdf/claim/${claimId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async generateAppliancePDF(applianceId: string) {
    const response = await fetch(`${this.baseURL}/pdf/appliance/${applianceId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    return response.blob();
  }

  async generateBookingPDF(bookingId: string) {
    const response = await fetch(`${this.baseURL}/pdf/booking/${bookingId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`PDF generation failed: ${response.statusText}`);
    }

    return response.blob();
  }

  downloadFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const apiClient = new ApplianceHubAPIClient();
export default ApplianceHubAPIClient;
