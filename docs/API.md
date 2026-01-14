# SyncWatch API Documentation

## Overview

The SyncWatch API provides RESTful endpoints for user authentication, room management, video uploads, and social features. Real-time synchronization is handled via WebSocket events (see [WEBSOCKET.md](WEBSOCKET.md)).

**Base URL**: `http://localhost:4000/api` (development)

**Authentication**: Bearer token in `Authorization` header
```
Authorization: Bearer <access_token>
```

## Table of Contents

1. [Authentication](#authentication)
2. [Rooms](#rooms)
3. [Videos](#videos)
4. [Users](#users)
5. [Friends](#friends)
6. [Error Responses](#error-responses)

---

## Authentication

### Register User

**POST** `/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "username": "john_doe",
  "password": "SecurePass123!"
}
```

**Validation:**
- `email`: Valid email format, max 255 chars
- `username`: 3-30 chars, alphanumeric + underscore only
- `password`: Min 8 chars

**Response:** `201 Created`
```json
{
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "username": "john_doe",
    "avatarUrl": null,
    "createdAt": "2025-01-14T12:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_abc123xyz..."
}
```

**Errors:**
- `400` - Validation error (invalid email/username/password)
- `409` - Email or username already exists

---

### Login

**POST** `/auth/login`

Authenticate and receive tokens.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "user": {
    "id": "clx123abc",
    "email": "user@example.com",
    "username": "john_doe",
    "avatarUrl": null,
    "createdAt": "2025-01-14T12:00:00Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_abc123xyz..."
}
```

**Errors:**
- `401` - Invalid credentials

---

### Refresh Token

**POST** `/auth/refresh`

Get a new access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "rt_abc123xyz..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "rt_new456def..."
}
```

**Errors:**
- `401` - Invalid or expired refresh token

---

### Logout

**POST** `/auth/logout` 🔒

Revoke the current refresh token.

**Request Body:**
```json
{
  "refreshToken": "rt_abc123xyz..."
}
```

**Response:** `200 OK`
```json
{
  "message": "Logged out successfully"
}
```

---

### Get Current User

**GET** `/auth/me` 🔒

Get authenticated user's profile.

**Response:** `200 OK`
```json
{
  "id": "clx123abc",
  "email": "user@example.com",
  "username": "john_doe",
  "avatarUrl": null,
  "createdAt": "2025-01-14T12:00:00Z"
}
```

**Errors:**
- `401` - Not authenticated

---

## Rooms

### Create Room

**POST** `/rooms` 🔒

Create a new room.

**Request Body:**
```json
{
  "name": "Movie Night",
  "maxParticipants": 5,
  "password": "secret123",
  "playbackControl": "owner_only"
}
```

**Fields:**
- `name`: 1-100 chars (required)
- `maxParticipants`: 2-5 (default: 5)
- `password`: Optional, min 4 chars
- `playbackControl`: `owner_only` | `all` | `selected` (default: `owner_only`)

**Response:** `201 Created`
```json
{
  "id": "clx456def",
  "code": "ABC12345",
  "name": "Movie Night",
  "ownerId": "clx123abc",
  "maxParticipants": 5,
  "playbackControl": "owner_only",
  "hasPassword": true,
  "videoId": null,
  "youtubeVideoId": null,
  "externalUrl": null,
  "createdAt": "2025-01-14T12:00:00Z",
  "expiresAt": "2025-01-15T12:00:00Z"
}
```

**Errors:**
- `400` - Validation error
- `401` - Not authenticated

---

### Get Room Info

**GET** `/rooms/:code`

Get room details and participant list.

**Path Parameters:**
- `code`: 8-character room code

**Response:** `200 OK`
```json
{
  "room": {
    "id": "clx456def",
    "code": "ABC12345",
    "name": "Movie Night",
    "ownerId": "clx123abc",
    "maxParticipants": 5,
    "playbackControl": "owner_only",
    "hasPassword": true,
    "videoId": null,
    "youtubeVideoId": null,
    "externalUrl": null,
    "createdAt": "2025-01-14T12:00:00Z",
    "expiresAt": "2025-01-15T12:00:00Z"
  },
  "participants": [
    {
      "id": "clx789ghi",
      "oderId": "od_abc123",
      "userId": "clx123abc",
      "guestName": null,
      "role": "owner",
      "canControl": true,
      "joinedAt": "2025-01-14T12:05:00Z",
      "user": {
        "username": "john_doe",
        "avatarUrl": null
      }
    }
  ]
}
```

**Errors:**
- `404` - Room not found

---

### Join Room

**POST** `/rooms/:code/join` 🔓

Join a room as authenticated user or guest.

**Path Parameters:**
- `code`: 8-character room code

**Request Body:**
```json
{
  "password": "secret123",
  "guestName": "Anonymous User"
}
```

**Fields:**
- `password`: Required if room has password
- `guestName`: Required for guest users, 1-50 chars

**Response:** `200 OK`
```json
{
  "participant": {
    "id": "clx789ghi",
    "roomId": "clx456def",
    "oderId": "od_abc123",
    "userId": "clx123abc",
    "guestName": null,
    "role": "participant",
    "canControl": false,
    "joinedAt": "2025-01-14T12:10:00Z"
  }
}
```

**Errors:**
- `400` - Validation error
- `401` - Incorrect password
- `403` - Room is full
- `404` - Room not found

---

### Leave Room

**POST** `/rooms/:code/leave` 🔒

Leave the current room.

**Path Parameters:**
- `code`: 8-character room code

**Response:** `200 OK`
```json
{
  "message": "Left room successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `404` - Room not found or not a participant

---

### Update Room

**PATCH** `/rooms/:code` 🔒

Update room settings (owner only).

**Path Parameters:**
- `code`: 8-character room code

**Request Body:**
```json
{
  "name": "Updated Movie Night",
  "playbackControl": "all",
  "videoId": "clx999vid",
  "youtubeVideoId": "dQw4w9WgXcQ",
  "externalUrl": "https://example.com/video.mp4"
}
```

**Fields (all optional):**
- `name`: 1-100 chars
- `playbackControl`: `owner_only` | `all` | `selected`
- `videoId`: Video ID from uploaded videos
- `youtubeVideoId`: YouTube video ID
- `externalUrl`: External video URL

**Response:** `200 OK`
```json
{
  "id": "clx456def",
  "code": "ABC12345",
  "name": "Updated Movie Night",
  "playbackControl": "all",
  "videoId": "clx999vid",
  "youtubeVideoId": null,
  "externalUrl": null,
  "updatedAt": "2025-01-14T12:15:00Z"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not room owner
- `404` - Room not found

---

### Delete Room

**DELETE** `/rooms/:code` 🔒

Delete a room (owner only).

**Path Parameters:**
- `code`: 8-character room code

**Response:** `200 OK`
```json
{
  "message": "Room deleted successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not room owner
- `404` - Room not found

---

## Videos

### Upload Video

**POST** `/videos/upload` 🔒

Upload a video file for transcoding.

**Request:**
- Content-Type: `multipart/form-data`
- Max file size: 8 GB
- Supported formats: mp4, webm, avi, mkv, mov

**Form Fields:**
- `file`: Video file (required)

**Response:** `201 Created`
```json
{
  "id": "clx999vid",
  "filename": "movie.mp4",
  "originalSize": 524288000,
  "mimeType": "video/mp4",
  "status": "processing",
  "progress": 0,
  "uploaderId": "clx123abc",
  "createdAt": "2025-01-14T12:20:00Z"
}
```

**Errors:**
- `400` - No file provided or invalid format
- `401` - Not authenticated
- `413` - File too large (> 8GB)

---

### Get Video Status

**GET** `/videos/:id/status` 🔒

Check transcoding status of uploaded video.

**Path Parameters:**
- `id`: Video ID

**Response:** `200 OK`
```json
{
  "id": "clx999vid",
  "filename": "movie.mp4",
  "status": "ready",
  "progress": 100,
  "duration": 7200,
  "width": 1920,
  "height": 1080,
  "manifestUrl": "https://cdn.example.com/videos/clx999vid/master.m3u8",
  "errorMessage": null
}
```

**Status Values:**
- `pending`: Queued for transcoding
- `processing`: Currently transcoding
- `ready`: Available for playback
- `failed`: Transcoding failed

**Errors:**
- `401` - Not authenticated
- `403` - Not the uploader
- `404` - Video not found

---

## Users

### Search Users

**GET** `/users/search?query=john` 🔒

Search for users by username.

**Query Parameters:**
- `query`: Search term (min 1 char, max 50 chars)

**Response:** `200 OK`
```json
[
  {
    "id": "clx123abc",
    "username": "john_doe",
    "avatarUrl": null
  },
  {
    "id": "clx456def",
    "username": "johnny_test",
    "avatarUrl": "https://cdn.example.com/avatars/456.jpg"
  }
]
```

**Errors:**
- `400` - Invalid query parameter
- `401` - Not authenticated

---

### Get User Profile

**GET** `/users/:id` 🔒

Get user profile by ID.

**Path Parameters:**
- `id`: User ID

**Response:** `200 OK`
```json
{
  "id": "clx123abc",
  "username": "john_doe",
  "avatarUrl": null,
  "createdAt": "2025-01-14T12:00:00Z"
}
```

**Errors:**
- `401` - Not authenticated
- `404` - User not found

---

## Friends

### Get Friends List

**GET** `/friends` 🔒

Get all accepted friends.

**Response:** `200 OK`
```json
[
  {
    "id": "clxfriend1",
    "status": "accepted",
    "createdAt": "2025-01-13T10:00:00Z",
    "friend": {
      "id": "clx456def",
      "username": "jane_smith",
      "avatarUrl": null
    }
  }
]
```

**Errors:**
- `401` - Not authenticated

---

### Get Friend Requests

**GET** `/friends/requests` 🔒

Get pending friend requests (sent and received).

**Response:** `200 OK`
```json
{
  "sent": [
    {
      "id": "clxreq1",
      "status": "pending",
      "createdAt": "2025-01-14T11:00:00Z",
      "addressee": {
        "id": "clx789ghi",
        "username": "bob_jones",
        "avatarUrl": null
      }
    }
  ],
  "received": [
    {
      "id": "clxreq2",
      "status": "pending",
      "createdAt": "2025-01-14T10:30:00Z",
      "requester": {
        "id": "clx999zzz",
        "username": "alice_wonder",
        "avatarUrl": null
      }
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated

---

### Send Friend Request

**POST** `/friends/request` 🔒

Send a friend request to another user.

**Request Body:**
```json
{
  "addresseeId": "clx456def"
}
```

**Response:** `201 Created`
```json
{
  "id": "clxreq3",
  "requesterId": "clx123abc",
  "addresseeId": "clx456def",
  "status": "pending",
  "createdAt": "2025-01-14T12:25:00Z"
}
```

**Errors:**
- `400` - Invalid user ID or already friends/pending
- `401` - Not authenticated
- `404` - User not found

---

### Accept Friend Request

**POST** `/friends/accept/:id` 🔒

Accept a pending friend request.

**Path Parameters:**
- `id`: Friendship ID

**Response:** `200 OK`
```json
{
  "id": "clxreq2",
  "requesterId": "clx999zzz",
  "addresseeId": "clx123abc",
  "status": "accepted",
  "updatedAt": "2025-01-14T12:30:00Z"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not the addressee
- `404` - Friend request not found

---

### Decline Friend Request

**DELETE** `/friends/decline/:id` 🔒

Decline a pending friend request.

**Path Parameters:**
- `id`: Friendship ID

**Response:** `200 OK`
```json
{
  "message": "Friend request declined"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not the addressee
- `404` - Friend request not found

---

### Remove Friend

**DELETE** `/friends/:id` 🔒

Remove an accepted friend.

**Path Parameters:**
- `id`: Friendship ID

**Response:** `200 OK`
```json
{
  "message": "Friend removed successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Not involved in friendship
- `404` - Friendship not found

---

### Block User

**POST** `/friends/block/:id` 🔒

Block a user (prevents friend requests).

**Path Parameters:**
- `id`: User ID to block

**Response:** `200 OK`
```json
{
  "id": "clxblock1",
  "requesterId": "clx123abc",
  "addresseeId": "clx789ghi",
  "status": "blocked",
  "createdAt": "2025-01-14T12:35:00Z"
}
```

**Errors:**
- `400` - Cannot block yourself
- `401` - Not authenticated
- `404` - User not found

---

## Error Responses

All errors follow this format:

```json
{
  "error": {
    "message": "Human-readable error message",
    "code": "ERROR_CODE",
    "details": {}
  }
}
```

### Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (not authenticated) |
| 403 | Forbidden (not authorized) |
| 404 | Not Found |
| 409 | Conflict (duplicate resource) |
| 413 | Payload Too Large |
| 429 | Too Many Requests (rate limited) |
| 500 | Internal Server Error |

### Error Codes

| Code | Description |
|------|-------------|
| `VALIDATION_ERROR` | Request validation failed |
| `UNAUTHORIZED` | Invalid or missing authentication |
| `FORBIDDEN` | Insufficient permissions |
| `NOT_FOUND` | Resource not found |
| `CONFLICT` | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | Too many requests |
| `INTERNAL_ERROR` | Server error |

### Rate Limiting

- **Global**: 100 requests per minute per IP
- **Sync Commands**: 10 commands per second per user

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1705234567
```

---

## Legend

- 🔒 **Requires authentication** - Must include valid Bearer token
- 🔓 **Optional authentication** - Works with or without token (guest mode)

---

## OpenAPI Specification

A full OpenAPI 3.0 specification is available at [openapi.yaml](openapi.yaml).

To explore the API interactively:
```bash
# Install Swagger UI
npm install -g swagger-ui-watcher

# Serve the spec
swagger-ui-watcher docs/openapi.yaml
```
