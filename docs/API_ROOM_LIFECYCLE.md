# Room Lifecycle & Smart Ownership API

This document describes the API endpoints for Phase 10.2 features: Smart Ownership and Room Lifecycle management.

**Base URL**: `http://localhost:4000/api`

**Authentication**: All endpoints require Bearer token authentication unless specified otherwise.

## Table of Contents

1. [Temporary Host](#temporary-host)
2. [Voting System](#voting-system)
3. [Scheduled Rooms](#scheduled-rooms)
4. [Room History](#room-history)
5. [Room Templates](#room-templates)

---

## Temporary Host

### Grant Temporary Host Permissions

**POST** `/rooms/:roomId/temporary-host`

Grant temporary host permissions to a participant in the room. Only the permanent room owner can grant these permissions.

**URL Parameters:**
- `roomId` - The room ID

**Request Body:**
```json
{
  "targetUserId": "clx123abc",
  "permissions": ["playback_control", "source_change"],
  "durationMs": 3600000
}
```

**Fields:**
- `targetUserId` (string, required) - User ID to grant permissions to
- `permissions` (array, required) - Array of permissions: `playback_control`, `source_change`, `kick_users`, `manage_permissions`
- `durationMs` (number, optional) - Duration in milliseconds. If omitted, permissions last until revoked

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "clx456def",
    "roomId": "clx789ghi",
    "permanentOwnerId": "clx123abc",
    "temporaryHostId": "clx234bcd",
    "grantedAt": "2025-01-14T12:00:00Z",
    "expiresAt": "2025-01-14T13:00:00Z",
    "permissions": ["playback_control", "source_change"],
    "revoked": false
  }
}
```

**Errors:**
- `403` - Only the room owner can grant temporary host permissions
- `404` - Room or target user not found
- `400` - Target user is not in the room

---

### Revoke Temporary Host Permissions

**DELETE** `/rooms/:roomId/temporary-host/:userId`

Revoke temporary host permissions from a user. Only the permanent room owner can revoke.

**URL Parameters:**
- `roomId` - The room ID
- `userId` - The user ID to revoke permissions from

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Temporary host revoked"
}
```

---

### Get Active Temporary Hosts

**GET** `/rooms/:roomId/temporary-hosts`

Get all active temporary hosts in a room.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx456def",
      "temporaryHostId": "clx234bcd",
      "permissions": ["playback_control"],
      "expiresAt": "2025-01-14T13:00:00Z"
    }
  ]
}
```

---

## Voting System

### Initiate Playback Vote

**POST** `/rooms/:roomId/vote`

Start a vote to pause or resume playback. Requires 60% majority to pass. Vote expires after 15 seconds.

**URL Parameters:**
- `roomId` - The room ID

**Request Body:**
```json
{
  "type": "pause"
}
```

**Fields:**
- `type` (enum, required) - Either `pause` or `resume`

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "clx789vote",
    "roomId": "clx123room",
    "type": "pause",
    "initiatedBy": "clx456user",
    "initiatedAt": "2025-01-14T12:00:00Z",
    "expiresAt": "2025-01-14T12:00:15Z",
    "threshold": 3,
    "votes": {},
    "resolved": false,
    "passed": false
  }
}
```

**Errors:**
- `409` - There is already an active vote in this room
- `404` - Room not found

---

### Cast Vote

**POST** `/votes/:voteId/cast`

Cast your vote on an active playback vote.

**URL Parameters:**
- `voteId` - The vote ID

**Request Body:**
```json
{
  "choice": "yes"
}
```

**Fields:**
- `choice` (enum, required) - Either `yes` or `no`

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx789vote",
    "votes": {
      "clx456user": "yes",
      "clx789user": "yes"
    },
    "resolved": false,
    "passed": false
  }
}
```

**Errors:**
- `400` - Vote already resolved or expired
- `400` - You are not a participant in this room
- `404` - Vote not found

---

### Get Active Vote

**GET** `/rooms/:roomId/vote`

Get the currently active vote in a room, if any.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx789vote",
    "type": "pause",
    "expiresAt": "2025-01-14T12:00:15Z",
    "threshold": 3,
    "votes": {
      "clx456user": "yes"
    }
  }
}
```

Returns `null` in `data` if no active vote.

---

## Scheduled Rooms

### Create Scheduled Room

**POST** `/scheduled-rooms`

Create a room scheduled for a future date/time. The room will automatically activate at the scheduled time.

**Request Body:**
```json
{
  "scheduledFor": "2025-01-15T18:00:00Z",
  "timezone": "America/New_York",
  "name": "Movie Night",
  "maxParticipants": 5,
  "password": "secret123",
  "playbackControl": "owner_only",
  "youtubeVideoId": "dQw4w9WgXcQ",
  "invitedUsers": ["clx123abc", "clx456def"]
}
```

**Fields:**
- `scheduledFor` (datetime, required) - When to activate the room (must be in future)
- `timezone` (string, optional) - IANA timezone (default: "UTC")
- `name` (string, required) - Room name
- `maxParticipants` (number, optional) - 2-5 (default: 5)
- `password` (string, optional) - Room password
- `playbackControl` (enum, optional) - `owner_only`, `all`, or `selected`
- `videoId` (string, optional) - Uploaded video ID
- `youtubeVideoId` (string, optional) - YouTube video ID
- `externalUrl` (string, optional) - External video URL
- `invitedUsers` (array, optional) - Array of user IDs to invite

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "clx123sched",
    "code": "ABC12XYZ",
    "scheduledFor": "2025-01-15T18:00:00Z",
    "status": "scheduled",
    "remindersSent": false
  }
}
```

**Errors:**
- `400` - Scheduled time must be in the future
- `400` - Validation errors

---

### Get User's Scheduled Rooms

**GET** `/scheduled-rooms`

Get all scheduled and active rooms created by the authenticated user.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123sched",
      "scheduledFor": "2025-01-15T18:00:00Z",
      "name": "Movie Night",
      "code": "ABC12XYZ",
      "status": "scheduled",
      "invitedUsers": ["clx123abc"]
    }
  ]
}
```

---

### Get Scheduled Room

**GET** `/scheduled-rooms/:id`

Get details of a specific scheduled room.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx123sched",
    "scheduledFor": "2025-01-15T18:00:00Z",
    "timezone": "America/New_York",
    "name": "Movie Night",
    "code": "ABC12XYZ",
    "maxParticipants": 5,
    "hasPassword": true,
    "status": "scheduled",
    "invitedUsers": ["clx123abc", "clx456def"],
    "youtubeVideoId": "dQw4w9WgXcQ"
  }
}
```

---

### Update Scheduled Room

**PATCH** `/scheduled-rooms/:id`

Update a scheduled room. Only the creator can update. Only works if status is still "scheduled".

**Request Body:**
```json
{
  "scheduledFor": "2025-01-15T19:00:00Z",
  "name": "Updated Movie Night"
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx123sched",
    "scheduledFor": "2025-01-15T19:00:00Z",
    "name": "Updated Movie Night"
  }
}
```

**Errors:**
- `403` - Only the creator can update
- `400` - Cannot update non-scheduled room

---

### Cancel Scheduled Room

**DELETE** `/scheduled-rooms/:id`

Cancel a scheduled room. Only the creator can cancel.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Scheduled room cancelled"
}
```

---

## Room History

### Get Watch History

**GET** `/history`

Get the authenticated user's watch history.

**Query Parameters:**
- `limit` (number, optional) - Items per page (default: 20)
- `offset` (number, optional) - Offset for pagination (default: 0)

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123hist",
      "roomName": "Movie Night",
      "sourceType": "youtube",
      "sourceData": {
        "videoId": "dQw4w9WgXcQ"
      },
      "watchedAt": "2025-01-14T20:00:00Z",
      "watchDurationMs": 3600000,
      "participants": ["john_doe", "jane_smith"],
      "thumbnail": "https://img.youtube.com/vi/dQw4w9WgXcQ/mqdefault.jpg",
      "isVisible": true
    }
  ],
  "pagination": {
    "limit": 20,
    "offset": 0,
    "total": 42
  }
}
```

---

### Hide History Entry

**PATCH** `/history/:id/hide`

Hide a history entry from your watch history. You can only hide your own entries.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "History entry hidden"
}
```

---

### Delete History Entry

**DELETE** `/history/:id`

Permanently delete a history entry. You can only delete your own entries.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "History entry deleted"
}
```

---

## Room Templates

### Create Room Template

**POST** `/templates`

Create a reusable room template with custom settings.

**Request Body:**
```json
{
  "name": "Movie Night Template",
  "isDefault": true,
  "settings": {
    "maxParticipants": 5,
    "playbackControl": "owner_only",
    "voiceEnabled": true,
    "chatEnabled": true,
    "ownerLock": true,
    "privacyPreset": "friends_only"
  }
}
```

**Response:** `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "clx123tmpl",
    "name": "Movie Night Template",
    "isDefault": true,
    "settings": { ... },
    "createdAt": "2025-01-14T12:00:00Z"
  }
}
```

---

### Get User's Templates

**GET** `/templates`

Get all room templates created by the authenticated user.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "clx123tmpl",
      "name": "Movie Night Template",
      "isDefault": true,
      "settings": { ... }
    }
  ]
}
```

---

### Get Default Template

**GET** `/templates/default`

Get the user's default template, if one is set.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx123tmpl",
    "name": "Movie Night Template",
    "settings": { ... }
  }
}
```

Returns `null` in `data` if no default template is set.

---

### Update Template

**PATCH** `/templates/:id`

Update a room template. Only the creator can update.

**Request Body:**
```json
{
  "name": "Updated Template Name",
  "settings": { ... }
}
```

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx123tmpl",
    "name": "Updated Template Name",
    "settings": { ... }
  }
}
```

---

### Delete Template

**DELETE** `/templates/:id`

Delete a room template. Only the creator can delete.

**Response:** `200 OK`
```json
{
  "success": true,
  "message": "Template deleted"
}
```

---

### Set Template as Default

**POST** `/templates/:id/set-default`

Set a template as the user's default. Automatically unsets any existing default.

**Response:** `200 OK`
```json
{
  "success": true,
  "data": {
    "id": "clx123tmpl",
    "isDefault": true
  }
}
```

---

## Common Error Responses

All endpoints may return these common error responses:

### 401 Unauthorized
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Missing or invalid authentication token"
  }
}
```

### 403 Forbidden
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You do not have permission to perform this action"
  }
}
```

### 404 Not Found
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 409 Conflict
```json
{
  "success": false,
  "error": {
    "code": "CONFLICT",
    "message": "Resource already exists or conflicting state"
  }
}
```

### 422 Validation Error
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": {
      "errors": [...]
    }
  }
}
```

### 500 Internal Server Error
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal server error occurred"
  }
}
```
