# Frontend Integration Guide

This document provides comprehensive integration instructions for connecting your frontend (React, Next.js, Vue, etc.) with the ApplianceHub backend APIs.

## Quick Start

### 1. Install the API Client

Copy `api-client.ts` to your frontend project:
```bash
# For React/Next.js
cp api-client.ts src/services/api-client.ts

# Or use it as a module
```

### 2. Initialize API Client

```typescript
import { apiClient } from '@/services/api-client';

// API client is already initialized with default base URL (http://localhost:3001)
// For production, initialize with custom URL:
const customApiClient = new ApplianceHubAPIClient('https://api.yourdomain.com');
```

---

## Complete API Reference

### Authentication Endpoints

All authentication endpoints handle token management automatically.

#### Register
```typescript
const response = await apiClient.register({
  email: 'user@example.com',
  password: 'SecurePassword123',
  name: 'John Doe',
  business_name: 'My Business',
  phone: '+1234567890',
  address: '123 Main St'
});

// Response includes:
// - access_token (stored automatically in localStorage)
// - refresh_token (stored automatically in localStorage)
// - user object with id, email, name, role, business_id
```

#### Login
```typescript
const response = await apiClient.login({
  email: 'user@example.com',
  password: 'SecurePassword123'
});

// Tokens stored automatically
```

#### Get Current User Profile
```typescript
const user = await apiClient.getProfile();
// Returns: UserProfile with id, email, name, role, business_id, etc.
```

#### Refresh Token
```typescript
await apiClient.refreshAccessToken();
// Automatically called on 401 errors
```

#### Logout
```typescript
await apiClient.logout();
// Clears all tokens from storage
```

#### Check Authentication Status
```typescript
const isLoggedIn = apiClient.isAuthenticated();
// Returns: boolean
```

---

### Business Endpoints

#### Get All Businesses
```typescript
const response = await apiClient.getBusinesses(limit = 50, offset = 0);

// Response:
// {
//   data: [Business[], ...],
//   total: number,
//   limit: 50,
//   offset: 0
// }
```

#### Get Single Business
```typescript
const business = await apiClient.getBusiness(businessId);

// Response: Business object with:
// - id, name, plan, plan_status, description
// - website, contact_email, contact_phone, logo_url
// - timezone, created_at
```

#### Get Business Statistics
```typescript
const stats = await apiClient.getBusinessStats(businessId);

// Response includes: users_count, appliances_count, total_claims, total_bookings, total_scans
```

#### Get Business Users
```typescript
const users = await apiClient.getBusinessUsers(businessId);

// Response: Array of UserProfile objects
```

---

### Appliance Endpoints

#### Get All Appliances
```typescript
const response = await apiClient.getAppliances(businessId, limit = 20, offset = 0);

// Response: PaginatedResponse<Appliance> with data array and pagination info
```

#### Get Single Appliance
```typescript
const appliance = await apiClient.getAppliance(applianceId);

// Response: Appliance object with:
// - id, business_id, name, model, serial_number
// - status, purchase_date, warranty_expiry
// - documents_count, active_warranties, claims_count, pending_claims
// - bookings_count, total_scans, created_at
```

#### Create Appliance
```typescript
const newAppliance = await apiClient.createAppliance(businessId, {
  name: 'Refrigerator',
  model: 'RF-2024-A',
  serial_number: 'SN123456',
  purchase_date: '2024-01-15',
  warranty_expiry: '2026-01-15'
});

// Response: Created Appliance object
```

#### Update Appliance
```typescript
const updated = await apiClient.updateAppliance(applianceId, {
  status: 'maintenance',
  // any other fields to update
});

// Response: Updated Appliance object
```

---

### Dashboard Endpoints

These are the core endpoints for your dashboard page.

#### Get Dashboard Statistics
```typescript
const stats = await apiClient.getDashboardStats(businessId);

// Response: DashboardStats object with:
// - total_appliances
// - active_appliances
// - total_documents
// - total_warranties
// - total_claims
// - pending_claims
// - total_bookings
// - total_qr_scans
```

#### Get Dashboard Appliances (Paginated)
```typescript
const response = await apiClient.getDashboardAppliances(
  businessId,
  limit = 20,
  offset = 0,
  sort = 'created_at'
);

// Response: PaginatedResponse<Appliance>
// Use for displaying appliances in table/list on dashboard
```

#### Get Dashboard Summary
```typescript
const summary = await apiClient.getDashboardSummary(businessId);

// Response: DashboardSummary with:
// - total_appliances
// - appliances_needing_attention (pending claims or inactive)
// - total_active_warranties
// - recent_bookings_count
// - last_updated timestamp
```

#### Get Warranty Status Breakdown
```typescript
const warranty = await apiClient.getWarrantyStatus(businessId);

// Response: WarrantyStatus with breakdown:
// - active: number
// - expired: number
// - void: number
// - total_warranties: number
```

#### Get Recent Activity Feed
```typescript
const activity = await apiClient.getRecentActivity(businessId, limit = 50);

// Response: RecentActivity with:
// - business_id
// - activities: [] (activity objects)
// - total: number
```

---

### File Upload Endpoints

#### Upload Document for Appliance
```typescript
const file = document.getElementById('file-input').files[0];

const response = await apiClient.uploadDocument(
  applianceId,
  file,
  documentType = 'manual' // 'manual', 'invoice', 'warranty', etc.
);

// Response includes file URL and document record
```

#### Upload Image
```typescript
const imageFile = document.getElementById('image-input').files[0];

const response = await apiClient.uploadImage(imageFile);

// Response includes image URL
```

#### Delete File
```typescript
await apiClient.deleteFile(fileId);

// No response data, just confirmation
```

---

### PDF Generation Endpoints

All PDF endpoints automatically download the file. Use `apiClient.downloadFile()` for manual handling.

#### Generate Warranty Certificate PDF
```typescript
const pdfBlob = await apiClient.generateWarrantyPDF(warrantyId);

// Auto-download or use:
apiClient.downloadFile(pdfBlob, 'warranty-certificate.pdf');
```

#### Generate Claim Details PDF
```typescript
const pdfBlob = await apiClient.generateClaimPDF(claimId);

apiClient.downloadFile(pdfBlob, 'claim-details.pdf');
```

#### Generate Appliance Report PDF
```typescript
const pdfBlob = await apiClient.generateAppliancePDF(applianceId);

apiClient.downloadFile(pdfBlob, 'appliance-report.pdf');
```

#### Generate Booking Confirmation PDF
```typescript
const pdfBlob = await apiClient.generateBookingPDF(bookingId);

apiClient.downloadFile(pdfBlob, 'booking-confirmation.pdf');
```

---

## Dashboard Page Implementation

Here's a complete example for building your dashboard page:

```typescript
// pages/dashboard.tsx or components/Dashboard.tsx

import { useEffect, useState } from 'react';
import { apiClient } from '@/services/api-client';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [summary, summary] = useState(null);
  const [appliances, setAppliances] = useState([]);
  const [warranty, setWarranty] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        const user = await apiClient.getProfile();
        const businessId = user.business_id;

        // Load all dashboard data in parallel
        const [dashStats, dashSummary, applianceList, warrantyData] = await Promise.all([
          apiClient.getDashboardStats(businessId),
          apiClient.getDashboardSummary(businessId),
          apiClient.getDashboardAppliances(businessId, 20, 0),
          apiClient.getWarrantyStatus(businessId),
        ]);

        setStats(dashStats);
        setSummary(dashSummary);
        setAppliances(applianceList.data);
        setWarranty(warrantyData);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      {/* Summary Cards */}
      <div className="summary-cards">
        <Card title="Total Appliances" value={summary.summary.total_appliances} />
        <Card title="Needing Attention" value={summary.summary.appliances_needing_attention} />
        <Card title="Active Warranties" value={summary.summary.total_active_warranties} />
        <Card title="Recent Bookings" value={summary.summary.recent_bookings_count} />
      </div>

      {/* Statistics */}
      <div className="statistics">
        <StatItem label="Active Appliances" value={stats.active_appliances} />
        <StatItem label="Total Claims" value={stats.total_claims} />
        <StatItem label="Pending Claims" value={stats.pending_claims} />
        <StatItem label="Total QR Scans" value={stats.total_qr_scans} />
      </div>

      {/* Warranty Breakdown */}
      <div className="warranty-status">
        <h3>Warranty Status</h3>
        <p>Active: {warranty.warranty_status.active}</p>
        <p>Expired: {warranty.warranty_status.expired}</p>
        <p>Void: {warranty.warranty_status.void}</p>
      </div>

      {/* Appliances Table */}
      <div className="appliances-table">
        <h3>Recent Appliances</h3>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Model</th>
              <th>Status</th>
              <th>Active Warranties</th>
              <th>Pending Claims</th>
            </tr>
          </thead>
          <tbody>
            {appliances.map((appliance) => (
              <tr key={appliance.id}>
                <td>{appliance.name}</td>
                <td>{appliance.model}</td>
                <td>{appliance.status}</td>
                <td>{appliance.active_warranties}</td>
                <td>{appliance.pending_claims}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

---

## Authentication Flow

### Login/Register Page
```typescript
import { useState } from 'react';
import { useRouter } from 'next/router';
import { apiClient } from '@/services/api-client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      await apiClient.login({ email, password });
      router.push('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
      />
      <button type="submit">Login</button>
    </form>
  );
}
```

### Protected Routes (Next.js)
```typescript
import { apiClient } from '@/services/api-client';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

export function withAuth(Component) {
  return function ProtectedComponent(props) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      const checkAuth = async () => {
        if (!apiClient.isAuthenticated()) {
          router.push('/login');
        } else {
          setLoading(false);
        }
      };

      checkAuth();
    }, [router]);

    if (loading) return <div>Loading...</div>;

    return <Component {...props} />;
  };
}

// Usage:
// export default withAuth(Dashboard);
```

---

## Error Handling

```typescript
import { apiClient } from '@/services/api-client';

try {
  const user = await apiClient.getProfile();
} catch (error) {
  if (error instanceof Error) {
    if (error.message.includes('401')) {
      // Unauthorized - redirect to login
      window.location.href = '/login';
    } else {
      console.error('API Error:', error.message);
    }
  }
}
```

---

## Environment Configuration

Create a `.env.local` file for your frontend:

```env
# For development
NEXT_PUBLIC_API_URL=http://localhost:3001

# For production
# NEXT_PUBLIC_API_URL=https://api.yourdomain.com
```

Then use it in your API client:

```typescript
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
const customApiClient = new ApplianceHubAPIClient(API_URL);
```

---

## Complete API Summary

### Authentication (5 endpoints)
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `GET /auth/me` - Get current user profile
- `POST /auth/refresh` - Refresh token
- `POST /auth/logout` - Logout user

### Businesses (4 endpoints)
- `GET /api/businesses` - List all businesses
- `GET /api/businesses/:id` - Get single business
- `GET /api/businesses/:id/stats` - Get business statistics
- `GET /api/businesses/:id/users` - Get business users

### Appliances (4 endpoints)
- `GET /api/appliances` - List appliances
- `GET /api/appliances/:id` - Get single appliance
- `POST /api/appliances` - Create appliance
- `PUT /api/appliances/:id` - Update appliance

### Dashboard (5 endpoints)
- `GET /api/dashboard/stats/:businessId` - Get statistics
- `GET /api/dashboard/appliances/:businessId` - Get appliances list
- `GET /api/dashboard/summary/:businessId` - Get summary
- `GET /api/dashboard/warranty-status/:businessId` - Get warranty breakdown
- `GET /api/dashboard/recent-activity/:businessId` - Get activity feed

### File Upload (3 endpoints)
- `POST /upload/document/:applianceId` - Upload document
- `POST /upload/image` - Upload image
- `DELETE /upload/:fileId` - Delete file

### PDF Generation (4 endpoints)
- `GET /pdf/warranty/:warrantyId` - Generate warranty PDF
- `GET /pdf/claim/:claimId` - Generate claim PDF
- `GET /pdf/appliance/:applianceId` - Generate appliance PDF
- `GET /pdf/booking/:bookingId` - Generate booking PDF

**Total: 25 API Endpoints**

---

## Testing APIs with Swagger UI

Visit `http://localhost:3001/api/swagger` to test all APIs interactively.

---

## Support

For issues or questions, refer to:
- Backend documentation: `API_DOCUMENTATION.md`
- Swagger UI: `http://localhost:3001/api/swagger`
- Quick start guide: `QUICK_START.md`
