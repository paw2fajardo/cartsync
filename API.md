# CartSync REST API Documentation

CartSync provides HTTP endpoints allowing external applications, automations (e.g. Home Assistant, Shortcuts, Node-RED), and integrations to query and interact with household shopping list data.

---

## Base URL

- **Local Development**: `http://localhost:3001`
- **Docker / Production**: `http://<your-host-ip>:<port>` (e.g. `http://192.168.10.200:9090`)

---

## Authentication

CartSync uses a shared household Bearer token configured via environment variable `HOUSEHOLD_SECRET` (or `SYNC_AUTH_TOKEN`).

When configured, every request to `/api/*` (except the public `/api/health` check) must include:

```http
Authorization: Bearer <HOUSEHOLD_SECRET>
```

> **Note**: If neither `HOUSEHOLD_SECRET` nor `SYNC_AUTH_TOKEN` is set on the server, authentication is disabled (open development mode).

### Error Responses

#### `401 Unauthorized`
Returned when the token is missing or invalid:
```json
{
  "error": "Unauthorized",
  "message": "Invalid or missing household authentication token"
}
```

---

## Endpoints

### 1. External Integration APIs (`/api/v1`)

#### `GET /api/v1/items`
Retrieves grocery items across all or specific lists with optional status filtering.

- **Method**: `GET`
- **Authentication**: Required (if secret configured)
- **Query Parameters**:

| Parameter | Type | Required | Description | Example |
| :--- | :--- | :--- | :--- | :--- |
| `listId` | `string` | No | Filter items belonging to a specific list. | `list_supermarket` |
| `status` | `string` | No | Filter by item workflow status: `'active'`, `'unavailable'`, `'archived'`. | `active` |
| `completed`| `boolean` | No | Filter by completion state: `true` or `false` (also accepts `1` or `0`). | `false` |

##### Request Example (cURL):
```bash
curl -H "Authorization: Bearer <YOUR_TOKEN>" \
  "http://<SERVER>:3001/api/v1/items?completed=false&status=active"
```

##### Request Example (PowerShell):
```powershell
Invoke-RestMethod -Uri "http://<SERVER>:3001/api/v1/items?completed=false" `
  -Headers @{ Authorization = "Bearer <YOUR_TOKEN>" }
```

##### Success Response (`200 OK`):
```json
{
  "items": [
    {
      "id": "item_1788581042244_mc6jz",
      "listId": "list_supermarket",
      "name": "Gardenia",
      "quantity": 2,
      "unit": "loaf",
      "category": "Bakery",
      "note": "Whole wheat if available",
      "completed": false,
      "completedAt": null,
      "completedBy": null,
      "addedBy": {
        "deviceId": "dev_1788576423015_0ryuv",
        "deviceName": "Kitchen iPad",
        "color": "#14b8a6"
      },
      "createdAt": 1788581042244,
      "updatedAt": 1788973586842,
      "contentUpdatedAt": 1788973586842,
      "contributors": [
        {
          "deviceId": "dev_1788973391864_tykep",
          "deviceName": "Dad Phone",
          "color": "#3b82f6",
          "count": 1
        }
      ],
      "status": "active",
      "isUnavailableRevert": false,
      "unavailableBy": null,
      "unavailableAt": null
    }
  ],
  "count": 1
}
```

---

### 2. Household State & Sync APIs

#### `GET /api/state`
Returns the full household synchronized snapshot including lists, items, devices, auto-list rules, and recent purchase history.

- **Method**: `GET`
- **Authentication**: Required

##### Success Response (`200 OK`):
```json
{
  "version": 2,
  "lastSyncedAt": 1788974891000,
  "householdName": "Our Home",
  "adminPinConfigured": false,
  "lists": [ ... ],
  "items": [ ... ],
  "devices": [ ... ],
  "autoListRules": [ ... ],
  "deviceItemHistory": [ ... ]
}
```

---

#### `POST /api/sync`
Performs state reconciliation and broadcasts updates to connected clients via WebSocket.

- **Method**: `POST`
- **Authentication**: Required
- **Body**: Application JSON payload containing `lists`, `items`, `autoListRules`, or `device`.

##### Success Response (`200 OK`):
Returns the updated household state object.

---

### 3. Backup & Maintenance APIs

#### `GET /api/backup`
Exports the complete database snapshot for backup purposes.

- **Method**: `GET`
- **Authentication**: Required

#### `POST /api/backup/restore`
Restores database contents from an exported backup object.

- **Method**: `POST`
- **Authentication**: Required
- **Body**: Complete backup JSON object.

#### `POST /api/reset`
Resets the SQLite database back to initial seed default lists and sample items.

- **Method**: `POST`
- **Authentication**: Required

---

### 4. System & Healthcheck

#### `GET /api/health`
Public healthcheck probe for Docker, Kubernetes, reverse proxies, and uptime monitors.

- **Method**: `GET`
- **Authentication**: None (always public)

##### Success Response (`200 OK`):
```json
{
  "status": "ok",
  "app": "CartSync Grocery Sync Server",
  "database": "sqlite3 (cartsync.db)",
  "version": 2,
  "schemaVersion": 2,
  "releaseVersion": "1.0.2",
  "gitCommit": "24ae544",
  "activeWsConnections": 2,
  "uptimeSeconds": 1420,
  "timestamp": 1788974950000
}
```
