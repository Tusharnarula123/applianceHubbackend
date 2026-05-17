interface PaginatedResponse<T> {
    data: T[];
    total: number;
    limit: number;
    offset: number;
}
export interface AuthCredentials {
    email: string;
    password: string;
}
export interface RegisterData extends AuthCredentials {
    name: string;
    business_name: string;
    phone?: string;
    address?: string;
}
export interface AuthResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role: string;
        business_id: string;
    };
}
interface UserProfile {
    id: string;
    email: string;
    name: string;
    role: string;
    business_id: string;
    is_active: boolean;
    created_at: string;
}
interface Business {
    id: string;
    name: string;
    plan: string;
    plan_status: string;
    description: string;
    website: string;
    contact_email: string;
    contact_phone: string;
    logo_url: string;
    timezone: string;
    created_at: string;
}
interface Appliance {
    id: string;
    business_id: string;
    name: string;
    model: string;
    serial_number: string;
    status: 'active' | 'inactive' | 'maintenance';
    purchase_date: string;
    warranty_expiry: string;
    documents_count: number;
    active_warranties: number;
    claims_count: number;
    pending_claims: number;
    bookings_count: number;
    total_scans: number;
    created_at: string;
}
interface DashboardStats {
    total_appliances: number;
    active_appliances: number;
    total_documents: number;
    total_warranties: number;
    total_claims: number;
    pending_claims: number;
    total_bookings: number;
    total_qr_scans: number;
}
interface DashboardSummary {
    business_id: string;
    summary: {
        total_appliances: number;
        appliances_needing_attention: number;
        total_active_warranties: number;
        recent_bookings_count: number;
    };
    last_updated: string;
}
interface WarrantyStatus {
    business_id: string;
    warranty_status: {
        active: number;
        expired: number;
        void: number;
    };
    total_warranties: number;
}
interface RecentActivity {
    business_id: string;
    activities: any[];
    total: number;
}
declare class ApplianceHubAPIClient {
    private baseURL;
    private accessToken;
    private refreshToken;
    constructor(baseURL?: string);
    private loadTokensFromStorage;
    private saveTokensToStorage;
    private clearTokens;
    private request;
    private uploadFile;
    register(data: RegisterData): Promise<AuthResponse>;
    login(credentials: AuthCredentials): Promise<AuthResponse>;
    getProfile(): Promise<UserProfile>;
    refreshAccessToken(): Promise<void>;
    logout(): Promise<void>;
    isAuthenticated(): boolean;
    getAccessToken(): string | null;
    getBusinesses(limit?: number, offset?: number): Promise<PaginatedResponse<Business>>;
    getBusiness(businessId: string): Promise<Business>;
    getBusinessStats(businessId: string): Promise<any>;
    getBusinessUsers(businessId: string): Promise<UserProfile[]>;
    getAppliances(businessId: string, limit?: number, offset?: number): Promise<PaginatedResponse<Appliance>>;
    getAppliance(applianceId: string): Promise<Appliance>;
    createAppliance(businessId: string, data: any): Promise<Appliance>;
    updateAppliance(applianceId: string, data: any): Promise<Appliance>;
    getDashboardStats(businessId: string): Promise<DashboardStats>;
    getDashboardAppliances(businessId: string, limit?: number, offset?: number, sort?: string): Promise<PaginatedResponse<Appliance>>;
    getDashboardSummary(businessId: string): Promise<DashboardSummary>;
    getWarrantyStatus(businessId: string): Promise<WarrantyStatus>;
    getRecentActivity(businessId: string, limit?: number): Promise<RecentActivity>;
    uploadDocument(applianceId: string, file: File, documentType?: string): Promise<any>;
    uploadImage(file: File): Promise<any>;
    deleteFile(fileId: string): Promise<void>;
    generateWarrantyPDF(warrantyId: string): Promise<Blob>;
    generateClaimPDF(claimId: string): Promise<Blob>;
    generateAppliancePDF(applianceId: string): Promise<Blob>;
    generateBookingPDF(bookingId: string): Promise<Blob>;
    downloadFile(blob: Blob, filename: string): void;
}
export declare const apiClient: ApplianceHubAPIClient;
export default ApplianceHubAPIClient;
