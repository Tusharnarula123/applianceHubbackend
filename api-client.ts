/** Resolve API base URL for Vite, Next.js, or Node */
export function resolveApiBaseUrl(): string {
  const meta = typeof import.meta !== 'undefined' ? (import.meta as unknown as { env?: Record<string, string> }) : null;
  if (meta?.env?.VITE_API_URL) {
    return meta.env.VITE_API_URL.replace(/\/$/, '');
  }
  if (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '');
  }
  if (typeof process !== 'undefined' && process.env?.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL.replace(/\/$/, '');
  }
  return 'http://localhost:3001';
}

class ApplianceHubAPIClient {
  baseURL: string;
  accessToken: string | null = null;
  refreshToken: string | null = null;

  constructor(baseURL?: string) {
    this.baseURL = (baseURL ?? resolveApiBaseUrl()).replace(/\/$/, '');
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

    // Do not set Content-Type — the browser must set multipart boundary automatically.
    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: formData,
    });

    const contentType = response.headers.get('content-type') ?? '';
    const isJson = contentType.includes('application/json');

    if (!response.ok) {
      let message = response.statusText;
      if (isJson) {
        const error = await response.json().catch(() => ({}));
        message =
          (Array.isArray(error.message) ? error.message.join(', ') : error.message) ||
          message;
      } else {
        const text = await response.text().catch(() => '');
        if (text && !text.startsWith('------')) {
          message = text.slice(0, 200);
        }
      }
      throw new Error(message || 'Upload failed');
    }

    if (!isJson) {
      throw new Error('Upload succeeded but server returned a non-JSON response');
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
    return this.request(
      `/api/appliances/business/${businessId}?limit=${limit}&offset=${offset}`,
      'GET',
    );
  }

  async getAppliance(applianceId: string) {
    return this.request(`/api/appliances/${applianceId}`, 'GET');
  }

  async getApplianceDocuments(applianceId: string) {
    return this.request(`/api/appliances/${applianceId}/documents`, 'GET');
  }

  async getApplianceClaims(applianceId: string) {
    return this.request(`/api/appliances/${applianceId}/claims`, 'GET');
  }

  /**
   * Fetches QR codes; backend auto-generates if missing when appliance has a model.
   * Call once per page — do not also rely on getAppliance().qr_codes for the image.
   * Use qr.image_src in <img src> (same-origin PNG). Response: { qr_codes, qr_code, data }.
   */
  async getApplianceQrCodes(applianceId: string) {
    return this.request(`/api/appliances/${applianceId}/qrcodes`, 'GET');
  }

  /** Normalize GET /qrcodes body for UI code that expects qr_codes[0] */
  pickPrimaryQrCode(payload: {
    qr_codes?: Array<Record<string, unknown>>;
    qr_code?: Record<string, unknown> | null;
    data?: Array<Record<string, unknown>>;
  }) {
    return payload.qr_code ?? payload.qr_codes?.[0] ?? payload.data?.[0] ?? null;
  }

  async generateApplianceQrCode(applianceId: string, size = '150x150') {
    return this.request(`/api/appliances/${applianceId}/qrcodes?size=${encodeURIComponent(size)}`, 'POST');
  }

  async lookupApplianceByModel(model: string) {
    return this.request(`/api/qr-codes/lookup?model=${encodeURIComponent(model)}`, 'GET');
  }

  async recordQrScan(qrCodeId: string) {
    return this.request(`/api/qr-codes/${qrCodeId}/scan`, 'POST');
  }

  /**
   * Use for <img src>. Prefer same-origin PNG URL (works with Next/Image).
   * Do not use `url` / `link` / `data` — those are the scan landing page, not the image.
   */
  getQrImageSrc(qr: { id: string; image_url?: string; image_src?: string }): string {
    const proxy = `${this.baseURL}/api/qr-codes/${qr.id}/image`;
    const src = qr.image_src ?? qr.image_url;
    if (!src) return proxy;
    if (src.startsWith('data:image/')) return src;
    if (src.includes('/api/qr-codes/')) return src;
    return proxy;
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

  /** Activity feed stats (by_type.claim, scan, etc.) — separate from claims_count on appliance details */
  async getActivityStats(businessId: string, days = 30) {
    return this.request(
      `/api/activities/business/${businessId}/stats?days=${days}`,
      'GET',
    );
  }

  async uploadDocument(applianceId: string, file: File, documentType = 'document') {
    return this.uploadFile(
      `/api/appliances/${applianceId}/documents?document_type=${encodeURIComponent(documentType)}`,
      file,
    );
  }

  /** Poll until embeddings exist in document_chunks (chatbot-ready), or timeout. */
  async waitForRagIndexing(
    applianceId: string,
    options: { intervalMs?: number; maxAttempts?: number } = {},
  ): Promise<{
    indexed: number;
    total: number;
    failed: number;
    chunks_with_embeddings: number;
    ready_for_chat: boolean;
  }> {
    const intervalMs = options.intervalMs ?? 3000;
    const maxAttempts = options.maxAttempts ?? 40;
    for (let i = 0; i < maxAttempts; i++) {
      const status = await this.getRagStatus(applianceId);
      if (status.ready_for_chat) {
        return {
          indexed: status.indexed,
          total: status.total,
          failed: status.failed,
          chunks_with_embeddings: status.chunks_with_embeddings,
          ready_for_chat: true,
        };
      }
      const settled =
        status.processing === 0 &&
        status.pending === 0 &&
        status.total > 0 &&
        status.chunks_with_embeddings === 0;
      if (settled) break;
      await new Promise((r) => setTimeout(r, intervalMs));
    }
    const last = await this.getRagStatus(applianceId);
    return {
      indexed: last.indexed,
      total: last.total,
      failed: last.failed,
      chunks_with_embeddings: last.chunks_with_embeddings ?? 0,
      ready_for_chat: !!last.ready_for_chat,
    };
  }

  async getRagStatus(applianceId: string) {
    return this.request(`/api/chat/ai/${applianceId}/rag-status`, 'GET');
  }

  /** PDFs in RAG + images with public_url — for chatbot gallery */
  async getChatKnowledgeMedia(applianceId: string) {
    return this.request(`/api/chat/ai/${applianceId}/knowledge-media`, 'GET');
  }

  async reindexApplianceDocuments(applianceId: string) {
    return this.request(`/api/chat/ai/${applianceId}/reindex`, 'POST');
  }

  async startAiChatSession(
    applianceId: string,
    customer?: { customer_name?: string; customer_email?: string },
  ) {
    return this.request('/api/chat/ai/session', 'POST', {
      appliance_id: applianceId,
      ...customer,
    });
  }

  async sendAiChatMessage(
    sessionId: string,
    message: string,
    customer?: { customer_name?: string; customer_email?: string },
  ) {
    return this.request(`/api/chat/ai/session/${sessionId}/message`, 'POST', {
      message,
      ...customer,
    });
  }

  async uploadImage(file: File) {
    return this.uploadFile('/api/upload/image', file);
  }

  async deleteFile(fileId: string) {
    return this.request(`/api/upload/${fileId}`, 'DELETE');
  }

  async deleteApplianceDocument(applianceId: string, documentId: string) {
    return this.request(
      `/api/appliances/${applianceId}/documents/${documentId}`,
      'DELETE',
    );
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
