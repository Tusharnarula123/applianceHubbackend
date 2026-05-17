import { useEffect, useState, useCallback } from 'react';
import { apiClient } from './api-client.js';
export function useAPI(apiCall, runImmediately = true) {
    const [state, setState] = useState({
        data: null,
        loading: runImmediately,
        error: null,
    });
    const fetchData = useCallback(async () => {
        setState({ data: null, loading: true, error: null });
        try {
            const result = await apiCall();
            setState({ data: result, loading: false, error: null });
        }
        catch (error) {
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
export function useDashboard(businessId) {
    const [dashboardState, setDashboardState] = useState({
        stats: null,
        summary: null,
        appliances: [],
        warranty: null,
        activity: null,
        loading: true,
        error: null,
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
            }
            catch (error) {
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
export function useAuth() {
    const [authState, setAuthState] = useState({
        user: null,
        isAuthenticated: apiClient.isAuthenticated(),
        loading: true,
        error: null,
    });
    useEffect(() => {
        const checkAuth = async () => {
            try {
                if (apiClient.isAuthenticated()) {
                    const user = await apiClient.getProfile();
                    setAuthState({ user, isAuthenticated: true, loading: false, error: null });
                }
                else {
                    setAuthState({ user: null, isAuthenticated: false, loading: false, error: null });
                }
            }
            catch (error) {
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
    const login = useCallback(async (email, password) => {
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
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error('Login failed');
            setAuthState((prev) => ({ ...prev, loading: false, error: err }));
            throw err;
        }
    }, []);
    const register = useCallback(async (data) => {
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
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error('Registration failed');
            setAuthState((prev) => ({ ...prev, loading: false, error: err }));
            throw err;
        }
    }, []);
    const logout = useCallback(async () => {
        try {
            await apiClient.logout();
            setAuthState({ user: null, isAuthenticated: false, loading: false, error: null });
        }
        catch (error) {
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
export function useAppliances(businessId, limit = 20) {
    const [appliancesState, setAppliancesState] = useState({
        data: [],
        total: 0,
        loading: true,
        error: null,
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
            }
            catch (error) {
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
export function useFileUpload() {
    const [uploadState, setUploadState] = useState({
        uploading: false,
        progress: 0,
        error: null,
    });
    const uploadDocument = useCallback(async (applianceId, file, documentType = 'document') => {
        try {
            setUploadState({ uploading: true, progress: 0, error: null });
            const result = await apiClient.uploadDocument(applianceId, file, documentType);
            setUploadState({ uploading: false, progress: 100, error: null });
            return result;
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error('Upload failed');
            setUploadState({ uploading: false, progress: 0, error: err });
            throw err;
        }
    }, []);
    const uploadImage = useCallback(async (file) => {
        try {
            setUploadState({ uploading: true, progress: 0, error: null });
            const result = await apiClient.uploadImage(file);
            setUploadState({ uploading: false, progress: 100, error: null });
            return result;
        }
        catch (error) {
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
export function usePDF() {
    const [pdfState, setPdfState] = useState({
        generating: false,
        error: null,
    });
    const downloadWarrantyPDF = useCallback(async (warrantyId) => {
        try {
            setPdfState({ generating: true, error: null });
            const blob = await apiClient.generateWarrantyPDF(warrantyId);
            apiClient.downloadFile(blob, `warranty-${warrantyId}.pdf`);
            setPdfState({ generating: false, error: null });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error('PDF generation failed');
            setPdfState({ generating: false, error: err });
            throw err;
        }
    }, []);
    const downloadClaimPDF = useCallback(async (claimId) => {
        try {
            setPdfState({ generating: true, error: null });
            const blob = await apiClient.generateClaimPDF(claimId);
            apiClient.downloadFile(blob, `claim-${claimId}.pdf`);
            setPdfState({ generating: false, error: null });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error('PDF generation failed');
            setPdfState({ generating: false, error: err });
            throw err;
        }
    }, []);
    const downloadAppliancePDF = useCallback(async (applianceId) => {
        try {
            setPdfState({ generating: true, error: null });
            const blob = await apiClient.generateAppliancePDF(applianceId);
            apiClient.downloadFile(blob, `appliance-${applianceId}.pdf`);
            setPdfState({ generating: false, error: null });
        }
        catch (error) {
            const err = error instanceof Error ? error : new Error('PDF generation failed');
            setPdfState({ generating: false, error: err });
            throw err;
        }
    }, []);
    const downloadBookingPDF = useCallback(async (bookingId) => {
        try {
            setPdfState({ generating: true, error: null });
            const blob = await apiClient.generateBookingPDF(bookingId);
            apiClient.downloadFile(blob, `booking-${bookingId}.pdf`);
            setPdfState({ generating: false, error: null });
        }
        catch (error) {
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
    useFileUpload,
    usePDF,
};
//# sourceMappingURL=useApplianceAPI.js.map