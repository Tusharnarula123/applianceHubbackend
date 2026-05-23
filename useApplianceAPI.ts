/**
 * React Hook for ApplianceHub API
 * Provides easy access to API client with error handling and state management
 */

import { useEffect, useState, useCallback } from 'react';
import { apiClient } from './api-client.js';

interface UseAPIState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

interface UseAPIResult<T> extends UseAPIState<T> {
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch data from API
 *
 * Usage:
 * const { data: user, loading, error } = useAPI(
 *   () => apiClient.getProfile(),
 *   true // run immediately
 * );
 */
export function useAPI<T>(
  apiCall: () => Promise<T>,
  runImmediately: boolean = true,
): UseAPIResult<T> {
  const [state, setState] = useState<UseAPIState<T>>({
    data: null,
    loading: runImmediately,
    error: null,
  });

  const fetchData = useCallback(async () => {
    setState({ data: null, loading: true, error: null });
    try {
      const result = await apiCall();
      setState({ data: result, loading: false, error: null });
    } catch (error) {
      setState({
        data: null,
        loading: false,
        error: error instanceof Error ? error : new Error('Unknown error'),
      });
    }
  }, [apiCall]);

  useEffect(() => {
    if (runImmediately) {
      fetchData();
    }
  }, [runImmediately, fetchData]);

  return {
    ...state,
    refetch: fetchData,
  };
}

/**
 * Hook for dashboard data
 * Fetches all dashboard-related data in parallel
 */
export function useDashboard(businessId: string) {
  const [dashboardState, setDashboardState] = useState({
    stats: null as any,
    summary: null as any,
    appliances: [] as any[],
    warranty: null as any,
    activity: null as any,
    loading: true,
    error: null as Error | null,
  });

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        setDashboardState((prev) => ({ ...prev, loading: true, error: null }));

        const [stats, summary, applianceList, warranty, activity] = await Promise.all([
          apiClient.getDashboardStats(businessId),
          apiClient.getDashboardSummary(businessId),
          apiClient.getDashboardAppliances(businessId, 100, 0),
          apiClient.getWarrantyStatus(businessId),
          apiClient.getRecentActivity(businessId, 50),
        ]);

        setDashboardState({
          stats,
          summary,
          appliances: applianceList.data,
          warranty,
          activity,
          loading: false,
          error: null,
        });
      } catch (error) {
        setDashboardState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to load dashboard'),
        }));
      }
    };

    if (businessId) {
      loadDashboard();
    }
  }, [businessId]);

  return dashboardState;
}

/**
 * Hook for user authentication
 * Manages login, register, and logout
 */
export function useAuth(): {
  user: any;
  isAuthenticated: boolean;
  loading: boolean;
  error: Error | null;
  login: (email: string, password: string) => Promise<any>;
  register: (data: any) => Promise<any>;
  logout: () => Promise<void>;
} {
  const [authState, setAuthState] = useState({
    user: null as any,
    isAuthenticated: apiClient.isAuthenticated(),
    loading: true,
    error: null as Error | null,
  });

  // Check authentication on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        if (apiClient.isAuthenticated()) {
          const user = await apiClient.getProfile();
          setAuthState({ user, isAuthenticated: true, loading: false, error: null });
        } else {
          setAuthState({ user: null, isAuthenticated: false, loading: false, error: null });
        }
      } catch (error) {
        setAuthState({
          user: null,
          isAuthenticated: false,
          loading: false,
          error: error instanceof Error ? error : new Error('Auth check failed'),
        });
      }
    };

    checkAuth();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await apiClient.login({ email, password });
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Login failed');
      setAuthState((prev) => ({ ...prev, loading: false, error: err }));
      throw err;
    }
  }, []);

  const register = useCallback(async (data: any) => {
    try {
      setAuthState((prev) => ({ ...prev, loading: true, error: null }));
      const response = await apiClient.register(data);
      setAuthState({
        user: response.user,
        isAuthenticated: true,
        loading: false,
        error: null,
      });
      return response;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Registration failed');
      setAuthState((prev) => ({ ...prev, loading: false, error: err }));
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiClient.logout();
      setAuthState({ user: null, isAuthenticated: false, loading: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Logout failed');
      setAuthState((prev) => ({ ...prev, error: err }));
      throw err;
    }
  }, []);

  return {
    ...authState,
    login,
    register,
    logout,
  };
}

/**
 * Hook for appliances
 */
export function useAppliances(businessId: string, limit: number = 20) {
  const [appliancesState, setAppliancesState] = useState({
    data: [] as any[],
    total: 0,
    loading: true,
    error: null as Error | null,
  });

  useEffect(() => {
    const loadAppliances = async () => {
      try {
        setAppliancesState((prev) => ({ ...prev, loading: true, error: null }));
        const response = await apiClient.getAppliances(businessId, limit, 0);
        setAppliancesState({
          data: response.data,
          total: response.total,
          loading: false,
          error: null,
        });
      } catch (error) {
        setAppliancesState((prev) => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error : new Error('Failed to load appliances'),
        }));
      }
    };

    if (businessId) {
      loadAppliances();
    }
  }, [businessId, limit]);

  return appliancesState;
}

/**
 * Hook for appliance documents
 */
export function useApplianceDocuments(applianceId: string) {
  return useAPI(
    () => apiClient.getApplianceDocuments(applianceId),
    !!applianceId,
  );
}

/**
 * Hook for appliance QR codes (auto-generated on backend when missing)
 */
export function useApplianceQrCodes(applianceId: string) {
  const [state, setState] = useState({
    qrCodes: [] as Array<{
      id: string;
      image_src: string;
      image_url: string;
      url: string;
      model: string;
      scan_count: number;
    }>,
    model: '' as string,
    loading: true,
    error: null as Error | null,
  });

  const load = useCallback(async () => {
    if (!applianceId) return;
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const result = await apiClient.getApplianceQrCodes(applianceId);
      const qrCodes = (result.qr_codes ?? []).map(
        (qr: { id: string; image_url?: string; url: string; model: string; scan_count: number }) => ({
          ...qr,
          image_url: apiClient.getQrImageSrc(qr),
        }),
      );
      setState({
        qrCodes,
        model: result.model ?? '',
        loading: false,
        error: null,
      });
    } catch (error) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error : new Error('Failed to load QR codes'),
      }));
    }
  }, [applianceId]);

  useEffect(() => {
    load();
  }, [load]);

  return { ...state, refetch: load };
}

/**
 * Hook for file upload
 */
export function useFileUpload() {
  const [uploadState, setUploadState] = useState({
    uploading: false,
    progress: 0,
    error: null as Error | null,
  });

  const uploadDocument = useCallback(async (applianceId: string, file: File, documentType: string = 'document') => {
    try {
      setUploadState({ uploading: true, progress: 0, error: null });
      const result = await apiClient.uploadDocument(applianceId, file, documentType);
      setUploadState({ uploading: false, progress: 100, error: null });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      setUploadState({ uploading: false, progress: 0, error: err });
      throw err;
    }
  }, []);

  const uploadImage = useCallback(async (file: File) => {
    try {
      setUploadState({ uploading: true, progress: 0, error: null });
      const result = await apiClient.uploadImage(file);
      setUploadState({ uploading: false, progress: 100, error: null });
      return result;
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Upload failed');
      setUploadState({ uploading: false, progress: 0, error: err });
      throw err;
    }
  }, []);

  return {
    ...uploadState,
    uploadDocument,
    uploadImage,
  };
}

/**
 * Hook for PDF generation and download
 */
export function usePDF() {
  const [pdfState, setPdfState] = useState({
    generating: false,
    error: null as Error | null,
  });

  const downloadWarrantyPDF = useCallback(async (warrantyId: string) => {
    try {
      setPdfState({ generating: true, error: null });
      const blob = await apiClient.generateWarrantyPDF(warrantyId);
      apiClient.downloadFile(blob, `warranty-${warrantyId}.pdf`);
      setPdfState({ generating: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('PDF generation failed');
      setPdfState({ generating: false, error: err });
      throw err;
    }
  }, []);

  const downloadClaimPDF = useCallback(async (claimId: string) => {
    try {
      setPdfState({ generating: true, error: null });
      const blob = await apiClient.generateClaimPDF(claimId);
      apiClient.downloadFile(blob, `claim-${claimId}.pdf`);
      setPdfState({ generating: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('PDF generation failed');
      setPdfState({ generating: false, error: err });
      throw err;
    }
  }, []);

  const downloadAppliancePDF = useCallback(async (applianceId: string) => {
    try {
      setPdfState({ generating: true, error: null });
      const blob = await apiClient.generateAppliancePDF(applianceId);
      apiClient.downloadFile(blob, `appliance-${applianceId}.pdf`);
      setPdfState({ generating: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('PDF generation failed');
      setPdfState({ generating: false, error: err });
      throw err;
    }
  }, []);

  const downloadBookingPDF = useCallback(async (bookingId: string) => {
    try {
      setPdfState({ generating: true, error: null });
      const blob = await apiClient.generateBookingPDF(bookingId);
      apiClient.downloadFile(blob, `booking-${bookingId}.pdf`);
      setPdfState({ generating: false, error: null });
    } catch (error) {
      const err = error instanceof Error ? error : new Error('PDF generation failed');
      setPdfState({ generating: false, error: err });
      throw err;
    }
  }, []);

  return {
    ...pdfState,
    downloadWarrantyPDF,
    downloadClaimPDF,
    downloadAppliancePDF,
    downloadBookingPDF,
  };
}

export default {
  useAPI,
  useDashboard,
  useAuth,
  useAppliances,
  useApplianceDocuments,
  useApplianceQrCodes,
  useFileUpload,
  usePDF,
};
