# Frontend Implementation Checklist

This checklist tracks all the APIs and components needed for your frontend website and dashboard.

---

## Backend APIs Status

### ✅ Authentication APIs (COMPLETED)

- [x] POST `/auth/register` - User registration
  - Input: email, password, name, business_name, phone, address
  - Output: access_token, refresh_token, user object
  - Frontend need: Register page

- [x] POST `/auth/login` - User login
  - Input: email, password
  - Output: access_token, refresh_token, user object
  - Frontend need: Login page

- [x] GET `/auth/me` - Get current user profile
  - Input: JWT Bearer token
  - Output: user object with id, email, name, role, business_id
  - Frontend need: Protected route guard, profile display

- [x] POST `/auth/refresh` - Refresh access token
  - Input: refresh_token
  - Output: new access_token
  - Frontend need: Auto-handled by api-client.ts

- [x] POST `/auth/logout` - Logout user
  - Input: JWT Bearer token
  - Output: confirmation
  - Frontend need: Logout button, clear tokens

---

### ✅ Business APIs (COMPLETED)

- [x] GET `/api/businesses` - List all businesses
  - Input: limit, offset (pagination)
  - Output: businesses array with pagination
  - Frontend need: Admin businesses list page (optional)

- [x] GET `/api/businesses/:id` - Get single business
  - Input: businessId
  - Output: Business object with all details
  - Frontend need: Business profile page (optional)

- [x] GET `/api/businesses/:id/stats` - Get business statistics
  - Input: businessId
  - Output: stats object
  - Frontend need: Dashboard statistics display

- [x] GET `/api/businesses/:id/users` - Get business users
  - Input: businessId
  - Output: Array of user objects
  - Frontend need: Users management page

---

### ✅ Appliance APIs (COMPLETED)

- [x] GET `/api/appliances` - List appliances
  - Input: business_id, limit, offset
  - Output: Paginated appliances array
  - Frontend need: Appliances list/table view

- [x] GET `/api/appliances/:id` - Get single appliance
  - Input: applianceId
  - Output: Complete appliance object
  - Frontend need: Appliance detail page

- [x] POST `/api/appliances` - Create appliance
  - Input: name, model, serial_number, purchase_date, warranty_expiry
  - Output: Created appliance object
  - Frontend need: Create appliance form

- [x] PUT `/api/appliances/:id` - Update appliance
  - Input: applianceId, fields to update
  - Output: Updated appliance object
  - Frontend need: Edit appliance form

---

### ✅ Dashboard APIs (COMPLETED)

- [x] GET `/api/dashboard/stats/:businessId` - Dashboard statistics
  - Output: total_appliances, active_appliances, total_documents, total_warranties, total_claims, pending_claims, total_bookings, total_qr_scans
  - Frontend need: Statistics cards/widgets

- [x] GET `/api/dashboard/appliances/:businessId` - Paginated appliances for dashboard
  - Input: businessId, limit, offset, sort
  - Output: Paginated appliances with all data
  - Frontend need: Appliances table/list on dashboard

- [x] GET `/api/dashboard/summary/:businessId` - Dashboard summary
  - Output: Quick summary with appliances_needing_attention, total_active_warranties, recent_bookings_count
  - Frontend need: Summary cards at top of dashboard

- [x] GET `/api/dashboard/warranty-status/:businessId` - Warranty breakdown
  - Output: active, expired, void warranty counts
  - Frontend need: Warranty status chart/widget

- [x] GET `/api/dashboard/recent-activity/:businessId` - Recent activity feed
  - Input: businessId, limit
  - Output: Activity array with timestamps
  - Frontend need: Activity feed section

---

### ✅ File Upload APIs (COMPLETED)

- [x] POST `/upload/document/:applianceId` - Upload appliance document
  - Input: File, document_type
  - Output: Document object with file URL
  - Frontend need: Document upload form/drag-drop

- [x] POST `/upload/image` - Upload image
  - Input: File
  - Output: Image object with file URL
  - Frontend need: Image upload for profile/appliance

- [x] DELETE `/upload/:fileId` - Delete uploaded file
  - Input: fileId
  - Output: confirmation
  - Frontend need: Delete button on file/image

---

### ✅ PDF Generation APIs (COMPLETED)

- [x] GET `/pdf/warranty/:warrantyId` - Generate warranty PDF
  - Input: warrantyId
  - Output: PDF blob
  - Frontend need: Download button on warranty

- [x] GET `/pdf/claim/:claimId` - Generate claim PDF
  - Input: claimId
  - Output: PDF blob
  - Frontend need: Download button on claim

- [x] GET `/pdf/appliance/:applianceId` - Generate appliance report PDF
  - Input: applianceId
  - Output: PDF blob
  - Frontend need: Download button on appliance detail

- [x] GET `/pdf/booking/:bookingId` - Generate booking confirmation PDF
  - Input: bookingId
  - Output: PDF blob
  - Frontend need: Download button on booking

---

## Frontend Pages Required

### Authentication Pages

- [ ] **Login Page** (`/login` or `/auth/login`)
  - Fields: email, password
  - Actions: Login with apiClient.login()
  - Error handling: display login errors
  - Success: redirect to dashboard with tokens stored
  - Related APIs: POST /auth/login

- [ ] **Register Page** (`/register` or `/auth/register`)
  - Fields: email, password, name, business_name, phone, address
  - Actions: Register with apiClient.register()
  - Error handling: display validation errors
  - Success: auto-login and redirect to dashboard
  - Related APIs: POST /auth/register

- [ ] **Logout Function**
  - Button: in header/navbar
  - Action: call apiClient.logout()
  - Result: clear tokens and redirect to login
  - Related APIs: POST /auth/logout

---

### Dashboard Pages

- [ ] **Main Dashboard** (`/dashboard` or `/app/dashboard`)
  - Components needed:
    - [ ] Header with user name and business name
    - [ ] Summary cards showing key metrics
    - [ ] Statistics display (active appliances, claims, etc.)
    - [ ] Warranty status widget (pie/bar chart)
    - [ ] Recent activity feed
    - [ ] Appliances list/table
  - Related APIs:
    - GET /auth/me (for user info)
    - GET /api/dashboard/stats
    - GET /api/dashboard/summary
    - GET /api/dashboard/warranty-status
    - GET /api/dashboard/recent-activity
    - GET /api/dashboard/appliances

- [ ] **Appliances Management Page** (`/dashboard/appliances`)
  - Components needed:
    - [ ] Appliances list/table with pagination
    - [ ] Search and filter
    - [ ] Create appliance button
    - [ ] Action buttons (edit, view details, delete)
  - Related APIs:
    - GET /api/appliances
    - POST /api/appliances
    - PUT /api/appliances/:id
    - GET /api/appliances/:id

- [ ] **Appliance Detail Page** (`/dashboard/appliances/:id`)
  - Components needed:
    - [ ] Appliance information display
    - [ ] Edit form
    - [ ] Document upload section
    - [ ] Warranty information
    - [ ] Claims history
    - [ ] Generate report PDF button
  - Related APIs:
    - GET /api/appliances/:id
    - PUT /api/appliances/:id
    - POST /upload/document/:applianceId
    - GET /pdf/appliance/:applianceId

- [ ] **User Profile Page** (`/dashboard/profile`)
  - Components needed:
    - [ ] Display user information
    - [ ] Edit profile form
    - [ ] Change password option
    - [ ] Logout button
  - Related APIs:
    - GET /auth/me
    - POST /auth/logout

---

### Supporting Components

#### Global Components

- [ ] **Navigation/Header**
  - Links to dashboard, appliances, profile
  - User menu with logout
  - Logo and branding

- [ ] **Sidebar Navigation**
  - Links to main pages
  - Collapse/expand functionality
  - Active page highlighting

- [ ] **Protected Route Wrapper**
  - Check if user is authenticated
  - Redirect to login if not
  - Pass user data to child components

- [ ] **Loading Spinner**
  - Show while API calls are in progress
  - Used across all pages

- [ ] **Error Boundary**
  - Catch and display errors
  - Retry functionality

- [ ] **Toast/Notification Component**
  - Show success/error messages
  - Auto-dismiss after timeout

#### Reusable Widgets

- [ ] **Statistics Card**
  - Display title, value, and optional trend
  - Used on dashboard

- [ ] **Data Table**
  - Pagination
  - Sorting
  - Filtering
  - Used for appliances, users, etc.

- [ ] **Form Components**
  - Text input with validation
  - Password input
  - File upload
  - Date picker
  - Select dropdown

- [ ] **Modal/Dialog**
  - Create/edit appliance
  - Confirm deletion
  - Warning messages

- [ ] **Chart Components**
  - Bar chart for warranty status
  - Line chart for trends
  - Pie chart for status breakdown

- [ ] **File Upload Component**
  - Drag & drop support
  - Progress indication
  - File validation

---

## API Integration Steps

### Step 1: Setup API Client
- [x] Create `api-client.ts` file ✓
- [ ] Copy to your frontend project: `src/services/api-client.ts`
- [ ] Create `useApplianceAPI.ts` for React hooks
- [ ] Copy to your frontend project: `src/hooks/useApplianceAPI.ts`

### Step 2: Setup Environment
- [ ] Create `.env.local` file
  ```env
  NEXT_PUBLIC_API_URL=http://localhost:3001
  ```
- [ ] Update API client to use environment variable

### Step 3: Create Authentication Pages
- [ ] Build login page with form
- [ ] Build register page with form
- [ ] Add error handling and validation
- [ ] Test login/register with Swagger
- [ ] Test token storage in localStorage

### Step 4: Create Protected Routes
- [ ] Create authentication guard HOC/middleware
- [ ] Redirect unauthenticated users to login
- [ ] Load user profile on app init
- [ ] Handle token refresh on 401 errors

### Step 5: Build Dashboard
- [ ] Create dashboard page layout
- [ ] Add statistics cards
- [ ] Add appliances table
- [ ] Add warranty status widget
- [ ] Add recent activity feed
- [ ] Test all dashboard APIs

### Step 6: Build Appliance Pages
- [ ] Create appliances list page
- [ ] Add pagination and sorting
- [ ] Create appliance detail page
- [ ] Add edit form
- [ ] Test all appliance APIs

### Step 7: File Upload Integration
- [ ] Create document upload component
- [ ] Add drag & drop support
- [ ] Display uploaded files
- [ ] Test file deletion

### Step 8: PDF Integration
- [ ] Add PDF download buttons
- [ ] Test all PDF endpoints
- [ ] Verify file downloads work

### Step 9: Testing
- [ ] Test all authentication flows
- [ ] Test dashboard with various data
- [ ] Test file uploads and downloads
- [ ] Test PDF generation
- [ ] Test error handling
- [ ] Test token refresh

### Step 10: Deployment
- [ ] Update API URL for production
- [ ] Build and test in production mode
- [ ] Deploy frontend
- [ ] Monitor for errors

---

## Files Provided

✅ **api-client.ts** - Complete API client with all 25 endpoints
✅ **useApplianceAPI.ts** - React hooks for easy API integration
✅ **FRONTEND_INTEGRATION.md** - Complete integration guide with examples
✅ **FRONTEND_CHECKLIST.md** - This file

---

## API Testing

All APIs can be tested at: **http://localhost:3001/api/swagger**

Use the Swagger UI to:
1. Register a new user
2. Login to get access token
3. Test all dashboard endpoints
4. Test file upload
5. Test PDF generation

---

## Next Steps

1. **Setup Frontend Project**
   - Create React/Next.js app if not already done
   - Install dependencies: `npm install` or `yarn install`

2. **Copy API Files**
   - Copy `api-client.ts` to `src/services/`
   - Copy `useApplianceAPI.ts` to `src/hooks/`

3. **Create Login Page**
   - Use `FRONTEND_INTEGRATION.md` example
   - Test with Swagger UI first

4. **Create Dashboard**
   - Start with statistics cards
   - Add appliances table
   - Add warranty widget

5. **Test End-to-End**
   - Register new user
   - Login and verify token storage
   - Navigate to dashboard
   - Verify all data loads correctly

---

## Support

For detailed code examples, see **FRONTEND_INTEGRATION.md**

For API documentation, see **API_DOCUMENTATION.md**

For quick start, see **QUICK_START.md**
