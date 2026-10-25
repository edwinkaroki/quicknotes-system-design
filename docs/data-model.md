# QuickNotes Database Data Model

## 1. Overview

QuickNotes uses a relational database to store users, their notes, tags, and the relationships between notes and tags. The database uses primary keys to identify records and foreign keys to maintain referential integrity.

## 2. Entities and Columns

### Users

Stores account information.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | Primary key |
| name | VARCHAR(100) | NOT NULL |
| email | VARCHAR(255) | NOT NULL, UNIQUE |
| password_hash | VARCHAR(255) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |

### Notes

Stores notes created by users.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | Primary key |
| user_id | INTEGER | NOT NULL, foreign key to users.id |
| title | VARCHAR(100) | NOT NULL |
| body | TEXT | Optional |
| created_at | TIMESTAMP | NOT NULL |
| updated_at | TIMESTAMP | NOT NULL |

### Tags

Stores labels created by users to organize their notes.

| Column | Type | Constraints |
|---|---|---|
| id | INTEGER | Primary key |
| user_id | INTEGER | NOT NULL, foreign key to users.id |
| name | VARCHAR(50) | NOT NULL |
| created_at | TIMESTAMP | NOT NULL |
| (user_id, name) | — | UNIQUE combination |

### Note_Tags

A join table connecting notes to tags.

| Column | Type | Constraints |
|---|---|---|
| note_id | INTEGER | Primary key component, foreign key to notes.id |
| tag_id | INTEGER | Primary key component, foreign key to tags.id |

The combination of `note_id` and `tag_id` forms a composite primary key, preventing the same tag from being assigned to the same note more than once.

## 3. Relationships

- **Users to Notes — one-to-many:** One user can own many notes, but each note belongs to one user.
- **Users to Tags — one-to-many:** One user can create many tags, but each tag belongs to one user.
- **Notes to Tags — many-to-many:** One note can have multiple tags, and one tag can be used on multiple notes.

The `note_tags` join table represents the many-to-many relationship between notes and tags. Without this table, storing multiple tag IDs in a single note column would make searching, updating, and enforcing relationships more difficult.

## 4. SQL Table Creation

The following schema uses SQLite-compatible SQL.

```sql
PRAGMA foreign_keys = ON;

CREATE TABLE users (
    id INTEGER PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE notes (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    title VARCHAR(100) NOT NULL,
    body TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE tags (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE (user_id, name)
);

CREATE TABLE note_tags (
    note_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (note_id, tag_id),
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE INDEX idx_notes_user_id ON notes(user_id);
CREATE INDEX idx_note_tags_tag_id ON note_tags(tag_id);
```

## 5. Example SQL Queries

### Query 1: Retrieve all notes belonging to a user

```sql
SELECT id, title, body, created_at
FROM notes
WHERE user_id = 1
ORDER BY updated_at DESC;
```

### Query 2: Find notes and their tags using JOIN

```sql
SELECT notes.title, tags.name AS tag_name
FROM notes
JOIN note_tags ON notes.id = note_tags.note_id
JOIN tags ON note_tags.tag_id = tags.id
WHERE notes.user_id = 1;
```

### Query 3: Count notes belonging to each user

```sql
SELECT users.name, COUNT(notes.id) AS note_count
FROM users
LEFT JOIN notes ON users.id = notes.user_id
GROUP BY users.id, users.name;
```

### Query 4: Find notes that have no tags

```sql
SELECT notes.id, notes.title
FROM notes
LEFT JOIN note_tags ON notes.id = note_tags.note_id
WHERE note_tags.note_id IS NULL;
```

## 6. Indexes

The index `idx_notes_user_id` on `notes(user_id)` helps the database retrieve a user's notes without scanning every note in the table. This is useful because the application frequently loads notes belonging to a specific authenticated user.

The index `idx_note_tags_tag_id` helps the database find notes associated with a particular tag. The primary keys and unique constraints also provide indexes for their respective keys in SQLite.

## 7. SQL versus NoSQL

I would choose a relational SQL database such as PostgreSQL for QuickNotes. Users, notes, and tags have clear relationships, and SQL provides foreign keys, unique constraints, transactions, and joins to preserve data integrity. A document-oriented NoSQL database could offer flexible schemas, but QuickNotes benefits more from structured relationships and reliable transactional updates. PostgreSQL is a suitable choice for a service that may grow to one million users.