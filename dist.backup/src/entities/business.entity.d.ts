export declare class BusinessEntity {
    id: string;
    name: string;
    description: string;
    website: string;
    contact_email: string;
    contact_phone: string;
    plan: string;
    plan_status: string;
    logo_url: string;
    timezone: string;
    metadata: Record<string, any>;
    created_at: Date;
    users: any[];
    appliances: any[];
    notifications: any[];
    activities: any[];
}
