# QuickNotes System Architecture

## 1. Overview

QuickNotes is a note-taking application that allows users to create, view, update, delete, and organize notes. The system is designed to support 1 million registered users while remaining secure, available, and responsive.

## 2. Functional Requirements

- Users can register and authenticate.
- Users can create, view, edit, and delete their notes.
- Users can organize notes using tags.
- Users can access only notes they own.
- The system validates requests and returns useful error messages.

## 3. Non-Functional Requirements

- **Performance:** Common note-reading requests should respond quickly.
- **Scalability:** The application should handle increasing numbers of users and requests.
- **Availability:** A failed application server should not take down the entire service.
- **Security:** Authentication, authorization, input validation, and encrypted connections are required.
- **Durability:** Notes should be stored reliably and backed up.
- **Consistency:** Creating or editing a note should update the primary database before the operation is reported as successful.

## 4. High-Level Architecture

```text
                    Users / Web Browser
                            |
                         DNS/CDN
                            |
                      Load Balancer
                            |
                 +----------+----------+
                 |                     |
             App Server 1          App Server 2
                 |                     |
                 +----------+----------+
                            |
                 +----------+----------+
                 |                     |
             Redis Cache          Message Queue
                 |                     |
                 |                 Background Worker
                 |                     |
                 +----------+----------+
                            |
                     Primary Database
                            |
                       Read Replica
```

### Component Responsibilities

- **DNS:** Directs users to the application’s domain.
- **CDN:** Delivers static files such as CSS, JavaScript, and images from locations closer to users. Private note contents should not be publicly cached.
- **Load balancer:** Distributes incoming requests across healthy application servers.
- **Application servers:** Authenticate users, validate requests, enforce note ownership, and implement API operations. They remain stateless so requests can reach any healthy server.
- **Redis cache:** Stores frequently accessed data to reduce repeated database reads. Cached note lists must be invalidated or updated after relevant changes.
- **Primary database:** Stores authoritative user, note, and tag records and handles writes.
- **Read replica:** Serves suitable read requests to reduce pressure on the primary database. Replication delay may mean that some recent changes are not immediately visible there.
- **Message queue:** Holds background jobs, such as search indexing or analytics, so they do not delay normal API responses.
- **Background worker:** Processes queued jobs independently of web requests.

## 5. Example Request Flows

### Reading Notes

1. The browser sends an authenticated request to `GET /notes`.
2. The load balancer forwards it to a healthy application server.
3. The server verifies the user's identity and authorization.
4. The server checks the cache for that user's note list.
5. If the data is not cached, the server retrieves it from the database and may cache the result.
6. The server returns the notes as JSON.

### Creating a Note

1. The browser sends `POST /notes` with the note title and body.
2. The application server authenticates the user and validates the input.
3. The server writes the new note to the primary database.
4. The server invalidates any cached note list affected by the change.
5. The server returns a successful response containing the created note.
6. Any optional background work is added to the message queue.

## 6. Capacity Estimates for 1 Million Registered Users

These are planning assumptions, not measured production traffic.

Assume 10% of registered users are active each day: 100,000 daily active users.

### Reads per Second

Assume each active user performs 50 note reads per day.

- Daily reads: 100,000 × 50 = 5,000,000
- Average reads per second: 5,000,000 ÷ 86,400 ≈ **58**
- With a 5× peak traffic factor: approximately **290 reads per second**

### Writes per Second

Assume each active user creates one note per day.

- Daily writes: 100,000 × 1 = 100,000
- Average writes per second: 100,000 ÷ 86,400 ≈ **1.2**
- With a 5× peak traffic factor: approximately **6 writes per second**

These estimates exclude additional updates, deletes, retries, and background jobs.

### Storage per Year

Assume each new note uses an average of 2 KB for its title, body, and metadata.

- Notes created per year: 100,000 × 365 = 36,500,000
- Raw note storage: 36,500,000 × 2 KB = **73 GB per year**, approximately

This estimate excludes indexes, user and tag records, database replicas, backups, and storage overhead. Actual usage depends on note lengths and user activity.

## 7. Caching Strategy

Redis can cache frequently requested note lists using keys scoped to the user, such as `notes:user:123`.

When a note is created, edited, or deleted, the application invalidates the affected cache entry. This prevents stale lists from remaining cached indefinitely. Cache misses fall back to the database.

The application must never return one user's private notes to another user because of an incorrectly shared cache key.

## 8. Reliability and Avoiding Single Points of Failure

- Run multiple application server instances behind a health-checking load balancer.
- Use database backups and a tested recovery procedure.
- Configure database replication and a failover plan.
- Deploy Redis and the message queue with suitable redundancy for the service's reliability requirements.
- Monitor errors, latency, server health, database load, queue depth, and cache hit rates.
- Test restoration from backups rather than assuming backups are usable.

A read replica improves read capacity but is not a substitute for backups.

## 9. Trade-Offs

### Caching vs. Freshness

Caching improves response times and reduces database load, but cached data can become stale. Invalidating affected cache entries after writes reduces this risk, at the cost of additional application logic.

### Read Replicas vs. Immediate Consistency

Read replicas reduce pressure on the primary database, but replication can lag. Requests that must immediately reflect a recent write can read from the primary database.

### Asynchronous Jobs vs. Immediate Results

A message queue keeps background processing from slowing API responses. However, queued tasks may finish later than the original request, so the system must monitor failures and retry jobs safely.

### SQL vs. NoSQL

A relational database is a suitable starting point because users, notes, and tags have clear relationships and benefit from transactions and constraints. If growth eventually exceeds one database's capacity, the team can evaluate partitioning, read scaling, and other approaches using measured workload data.

## 10. Conclusion

QuickNotes uses stateless application servers, a load balancer, caching, a primary database with a read replica, and asynchronous background processing. Capacity estimates provide an initial sizing guide; monitoring real traffic will inform future scaling decisions.