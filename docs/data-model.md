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
    id INTEGER PRIMARY KEY
    