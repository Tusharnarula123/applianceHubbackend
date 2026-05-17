interface UseAPIState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
}
interface UseAPIResult<T> extends UseAPIState<T> {
    refetch: () => Promise<void>;
}
export declare function useAPI<T>(apiCall: () => Promise<T>, runImmediately?: boolean): UseAPIResult<T>;
export declare function useDashboard(businessId: string): {
    stats: any;
    summary: any;
    appliances: any[];
    warranty: any;
    activity: any;
    loading: boolean;
    error: Error | null;
};
export declare function useAuth(): {
    user: any;
    isAuthenticated: boolean;
    loading: boolean;
    error: Error | null;
    login: (email: string, password: string) => Promise<any>;
    register: (data: any) => Promise<any>;
    logout: () => Promise<void>;
};
export declare function useAppliances(businessId: string, limit?: number): {
    data: any[];
    total: number;
    loading: boolean;
    error: Error | null;
};
export declare function useFileUpload(): {
    uploadDocument: (applianceId: string, file: File, documentType?: string) => Promise<any>;
    uploadImage: (file: File) => Promise<any>;
    uploading: boolean;
    progress: number;
    error: Error | null;
};
export declare function usePDF(): {
    downloadWarrantyPDF: (warrantyId: string) => Promise<void>;
    downloadClaimPDF: (claimId: string) => Promise<void>;
    downloadAppliancePDF: (applianceId: string) => Promise<void>;
    downloadBookingPDF: (bookingId: string) => Promise<void>;
    generating: boolean;
    error: Error | null;
};
declare const _default: {
    useAPI: typeof useAPI;
    useDashboard: typeof useDashboard;
    useAuth: typeof useAuth;
    useAppliances: typeof useAppliances;
    useFileUpload: typeof useFileUpload;
    usePDF: typeof usePDF;
};
export default _default;
