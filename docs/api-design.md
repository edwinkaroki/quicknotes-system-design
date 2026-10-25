# QuickNotes REST API Design

## 1. Overview

The QuickNotes API allows authenticated users to create, view, update, and delete notes, as well as organize notes using tags.

**Base URL:** `https://api.quicknotes.example/v1`

**Authentication:** Protected endpoints require a valid access token sent in the `Authorization` header.

Example:

`Authorization: Bearer <access_token>`

**Content type:** Requests and responses containing JSON use `Content-Type: application/json`.

## 2. Endpoints

| Method | Path | Description | Success status |
|---|---|---|---|
| GET | `/notes` | Lists the authenticated user's notes, with optional pagination. | `200 OK` |
| GET | `/notes/{id}` | Retrieves one note owned by the authenticated user. | `200 OK` |
| POST | `/notes` | Creates a new note. | `201 Created` |
| PUT | `/notes/{id}` | Replaces an existing note's title and body. | `200 OK` |
| PATCH | `/notes/{id}` | Updates selected fields of an existing note. | `200 OK` |
| DELETE | `/notes/{id}` | Deletes an existing note. | `204 No Content` |
| GET | `/tags` | Lists tags belonging to the authenticated user. | `200 OK` |
| POST | `/notes/{id}/tags` | Associates an existing tag with a note. | `201 Created` |

All note operations must enforce ownership so users cannot access or modify other users' private notes.

## 3. Create a Note

**Request**

- Method: `POST`
- Path: `/notes`
- Success status: `201 Created`

Example request:

```json
{
  "title": "Study plan",
  "body": "Review SQL joins and API design."
}
```

The server obtains the user identity from the access token rather than trusting a user ID supplied in the request body.

Example response:

```json
{
  "id": 101,
  "user_id": 1,
  "title": "Study plan",
  "body": "Review SQL joins and API design.",
  "created_at": "2026-10-25T20:00:00Z",
  "updated_at": "2026-10-25T20:00:00Z"
}
```

The server generates the note ID and timestamps. The actual values depend on the database and request time.

## 4. List Notes

**Request**

- Method: `GET`
- Path: `/notes`
- Success status: `200 OK`

Optional query parameters include `limit` and `offset` for pagination.

Example request:

`GET /notes?limit=10&offset=0`

Example response:

```json
{
  "data": [
    {
      "id": 101,
      "title": "Study plan",
      "body": "Review SQL joins and API design.",
      "created_at": "2026-10-25T20:00:00Z",
      "updated_at": "2026-10-25T20:00:00Z"
    },
    {
      "id": 102,
      "title": "Shopping list",
      "body": "Milk, oats, and bananas.",
      "created_at": "2026-10-25T20:05:00Z",
      "updated_at": "2026-10-25T20:05:00Z"
    }
  ],
  "pagination": {
    "limit": 10,
    "offset": 0,
    "total": 2
  }
}
```

If the user has no notes, the API returns `200 OK` with an empty `data` array.

## 5. Update a Note

**Request**

- Method: `PATCH`
- Path: `/notes/101`
- Success status: `200 OK`

Example request:

```json
{
  "title": "Updated study plan"
}
```

Example response:

```json
{
  "id": 101,
  "user_id": 1,
  "title": "Updated study plan",
  "body": "Review SQL joins and API design.",
  "created_at": "2026-10-25T20:00:00Z",
  "updated_at": "2026-10-25T20:10:00Z"
}
```

Only the supplied fields are changed. Fields omitted from the request retain their existing values.

## 6. Delete a Note

**Request**

- Method: `DELETE`
- Path: `/notes/101`
- Success status: `204 No Content`

A successful deletion returns no response body. Requests for notes that do not exist or are not accessible follow the API's documented error policy.

## 7. Error Status Codes

| Status | Meaning | Example |
|---|---|---|
| `400 Bad Request` | The request is malformed or contains invalid data. | The title exceeds 100 characters. |
| `401 Unauthorized` | Authentication is missing or invalid. | An expired access token is supplied. |
| `403 Forbidden` | The user is authenticated but is not allowed to perform the operation. | An account lacks permission for a restricted operation. |
| `404 Not Found` | The requested resource does not exist or is not accessible. | A note ID does not exist. |
| `500 Internal Server Error` | An unexpected server-side failure occurred. | The application encounters an unhandled database error. |

For private notes, the backend may return `404` for a note owned by another user to avoid revealing that the note exists.

### Example error response

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The title must be 100 characters or fewer."
  }
}
```

The API should use consistent error structures and avoid exposing passwords, access tokens, database details, or internal stack traces.

## 8. Validation and Security

- A note title is required and must contain between 1 and 100 characters after trimming whitespace.
- A note body is optional.
- The API validates request bodies before writing to the database.
- Authentication is required for private note and