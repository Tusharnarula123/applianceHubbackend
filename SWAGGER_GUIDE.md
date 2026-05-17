# 📚 Swagger/OpenAPI Documentation Guide

Your API now has **interactive Swagger documentation** built-in!

---

## 🎯 Access Swagger UI

**Open in browser:**
```
http://localhost:3001/api/docs
```

## What You'll Find

✅ **All 6 Modules** - Businesses, Appliances, Claims, Bookings, Chat, Activities  
✅ **Every Endpoint** - GET, POST, PUT, DELETE with full documentation  
✅ **Request/Response Examples** - See exactly what to send and what you'll get back  
✅ **Try It Out** - Test APIs directly from the browser  
✅ **Auto-Generated** - Stays in sync with code changes  

---

## Using Swagger UI

### 1. **View All Endpoints**
- Click on each module tag to expand/collapse
- See all endpoints with their HTTP methods (GET, POST, etc.)

### 2. **Try an Endpoint**
```
1. Click on an endpoint (e.g., "GET /api/appliances/business/{businessId}")
2. Click "Try it out"
3. Fill in the parameters
4. Click "Execute"
5. See the response below
```

### 3. **Example: Get All Appliances**
```
GET /api/appliances/business/{businessId}?limit=50&offset=0

Parameters:
- businessId: Your business UUID (required)
- limit: 50 (optional, default)
- offset: 0 (optional, default)

Response: 200 OK
{
  "data": [...],
  "total": 12,
  "limit": 50,
  "offset": 0
}
```

### 4. **Example: Create a Claim**
```
POST /api/claims

Body:
{
  "appliance_id": "uuid",
  "warranty_registration_id": "uuid",
  "issue_description": "Something broke",
  "status": "open",
  "priority": "high"
}

Response: 201 Created
{
  "id": "uuid",
  "appliance_id": "uuid",
  ...
}
```

---

## 📡 API Endpoints by Module

### 🏢 BUSINESSES
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/businesses` | Get all businesses |
| GET | `/api/businesses/{id}` | Get single business |
| GET | `/api/businesses/{id}/users` | Get business users |
| GET | `/api/businesses/{id}/stats` | Get business dashboard stats |
| POST | `/api/businesses` | Create business |
| PUT | `/api/businesses/{id}` | Update business |
| DELETE | `/api/businesses/{id}` | Delete business |

### 🏠 APPLIANCES
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/appliances/business/{businessId}` | Get all appliances |
| GET | `/api/appliances/{id}` | Get single appliance |
| GET | `/api/appliances/{id}/documents` | Get documents only |
| GET | `/api/appliances/{id}/claims` | Get claims only |
| GET | `/api/appliances/{id}/bookings` | Get bookings only |
| GET | `/api/appliances/{id}/qrcodes` | Get QR codes only |
| GET | `/api/appliances/{id}/stats` | Get appliance stats |
| POST | `/api/appliances` | Create appliance |
| PUT | `/api/appliances/{id}` | Update appliance |
| DELETE | `/api/appliances/{id}` | Delete appliance |

### 📋 CLAIMS
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/claims/{id}` | Get single claim |
| GET | `/api/claims/appliance/{applianceId}` | Get all claims for appliance |
| GET | `/api/claims/appliance/{applianceId}/status/{status}` | Filter by status |
| POST | `/api/claims` | Create claim |
| PUT | `/api/claims/{id}` | Update claim |
| DELETE | `/api/claims/{id}` | Delete claim |

### 📅 BOOKINGS
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/bookings/{id}` | Get single booking |
| GET | `/api/bookings/appliance/{applianceId}` | Get appliance bookings |
| GET | `/api/bookings/status/{status}` | Filter by status |
| GET | `/api/bookings/upcoming/list` | Get upcoming bookings |
| POST | `/api/bookings` | Create booking |
| PUT | `/api/bookings/{id}` | Update booking |
| DELETE | `/api/bookings/{id}` | Delete booking |

### 💬 CHAT
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/chat/session/{sessionId}` | Get chat session with messages |
| GET | `/api/chat/session/{sessionId}/messages` | Get paginated messages |
| GET | `/api/chat/appliance/{applianceId}/sessions` | Get all sessions for appliance |
| GET | `/api/chat/active/sessions` | Get active sessions |
| POST | `/api/chat/session` | Create chat session |
| POST | `/api/chat/session/{sessionId}/message` | Add message |
| PUT | `/api/chat/session/{sessionId}/end` | End chat session |

### 📊 ACTIVITIES
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/activities/business/{businessId}` | Get business activities |
| GET | `/api/activities/appliance/{applianceId}` | Get appliance activities |
| GET | `/api/activities/business/{businessId}/type/{type}` | Filter by type |
| GET | `/api/activities/business/{businessId}/stats` | Get activity statistics |
| POST | `/api/activities` | Log new activity |

---

## 🚀 Quick Start Examples

### Get a Business
```bash
curl http://localhost:3001/api/businesses/your-business-uuid
```

### Create an Appliance
```bash
curl -X POST http://localhost:3001/api/appliances \
  -H "Content-Type: application/json" \
  -d '{
    "business_id": "your-uuid",
    "name": "Washing Machine",
    "model": "WM-2024",
    "status": "active"
  }'
```

### Get Appliance with Stats
```bash
curl http://localhost:3001/api/appliances/appliance-uuid/stats
```

### Create a Claim
```bash
curl -X POST http://localhost:3001/api/claims \
  -H "Content-Type: application/json" \
  -d '{
    "appliance_id": "uuid",
    "warranty_registration_id": "uuid",
    "issue_description": "Not working",
    "status": "open",
    "priority": "high"
  }'
```

---

## 🔄 Generate API Clients

Swagger generates client code automatically!

### JavaScript/TypeScript
```
In Swagger UI:
1. Click "Generate Client" (if available)
2. Select TypeScript
3. Copy the generated API client
4. Use in your frontend
```

### Or use OpenAPI Generator
```bash
# Generate TypeScript client
npx @openapitools/openapi-generator-cli generate \
  -i http://localhost:3001/api/docs-json \
  -g typescript-axios \
  -o ./src/api

# Other generators: python, java, go, csharp, swift, kotlin...
```

---

## 📖 API Documentation Flow

When you open **http://localhost:3001/api/docs**, you get:

```
┌─────────────────────────────────────────┐
│   ApplianceHub API v1.0.0               │
│   Optimized REST API with caching       │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│   Modules (Click to expand)              │
│   • 🏢 Businesses                        │
│   • 🏠 Appliances                        │
│   • 📋 Claims                            │
│   • 📅 Bookings                          │
│   • 💬 Chat                              │
│   • 📊 Activities                        │
└─────────────────────────────────────────┘
            ↓
┌─────────────────────────────────────────┐
│   Endpoints with Full Details            │
│   • HTTP Method (GET, POST, etc.)        │
│   • URL Path                             │
│   • Parameters & Types                   │
│   • Request Body Examples                │
│   • Response Examples (200, 201, etc.)   │
│   • "Try it out" Button                  │
└─────────────────────────────────────────┘
```

---

## 🔧 Development Workflow

### 1. **Design in Swagger**
```
1. Open Swagger UI
2. Test your endpoints
3. See examples
4. Copy curl commands
```

### 2. **Build in Code**
```
1. Write your API code
2. Add @ApiOperation decorators
3. Swagger auto-updates
```

### 3. **Test in Swagger**
```
1. Refresh browser
2. See updated endpoints
3. Try it out
4. Copy working curl commands
```

---

## 📝 Common Responses

### Success (200 OK)
```json
{
  "id": "uuid",
  "name": "Data",
  "status": "active",
  "created_at": "2026-05-16T..."
}
```

### Created (201 Created)
```json
{
  "id": "uuid",
  "name": "New Data",
  "created_at": "2026-05-16T..."
}
```

### Error (400 Bad Request)
```json
{
  "statusCode": 400,
  "message": "Invalid input",
  "error": "BadRequest"
}
```

### Not Found (404)
```json
{
  "statusCode": 404,
  "message": "Resource not found",
  "error": "NotFound"
}
```

---

## 🎨 Customization

### Add API Key Authentication
```typescript
// In main.ts
.addApiKey(
  new ApiKeyAuth(),
  'api-key',
)
```

### Add Bearer Token
```typescript
// In main.ts
.addBearerAuth()
```

### Add Tags for Grouping
```typescript
// Already added!
.addTag('Businesses', 'Business account management')
.addTag('Appliances', 'Appliance registration and management')
// etc...
```

---

## 📊 Server Information

When you start the server, you see:
```
╔════════════════════════════════════════════════════════════╗
║         🚀 ApplianceHub API Server Started                 ║
╠════════════════════════════════════════════════════════════╣
║                                                            ║
║  📡 API Server:  http://localhost:3001                    ║
║  📚 Swagger Docs: http://localhost:3001/api/docs          ║
║                                                            ║
║  🗄️  MySQL:  localhost:3308                               ║
║  🔴 Redis:  localhost:6380                                ║
║                                                            ║
║  ✨ Features:                                             ║
║   • 13 interconnected tables                              ║
║   • 6 optimized services                                  ║
║   • Redis caching with smart invalidation                ║
║   • Single query loading (no N+1 problems)               ║
║   • Batch operations after queries                       ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
```

---

## 🚀 You're Ready!

Your API is fully documented and ready to:
- ✅ Explore in Swagger UI
- ✅ Test endpoints interactively  
- ✅ Generate client code
- ✅ Share with your team
- ✅ Build your frontend against

**Open browser:** http://localhost:3001/api/docs

Happy coding! 🎉
