\# QuickNotes System Architecture



\## 1. Overview



QuickNotes is a note-taking application that allows users to create, view, update, delete, and organize notes. The system is designed to support 1 million registered users while remaining secure, available, and responsive.



\## 2. Functional Requirements



\- Users can register and authenticate.

\- Users can create, view, edit, and delete their notes.

\- Users can organize notes using tags.

\- Users can access only notes they own.

\- The system validates requests and returns useful error messages.



\## 3. Non-Functional Requirements



\- \*\*Performance:\*\* Common note-reading requests should respond quickly.

\- \*\*Scalability:\*\* The application should handle increasing numbers of users and requests.

\- \*\*Availability:\*\* A failed application server should not take down the entire service.

\- \*\*Security:\*\* Authentication, authorization, input validation, and encrypted connections are required.

\- \*\*Durability:\*\* Notes should be stored reliably and backed up.

\- \*\*Consistency:\*\* Creating or editing a note should update the primary database before the operation is reported as successful.



\## 4. High-Level Architecture



```text

\&#x20;                   Users / Web Browser

\&#x20;                           |

\&#x20;                        DNS/CDN

\&#x20;                           |

\&#x20;                     Load Balancer

\&#x20;                           |

\&#x20;                +----------+----------+

\&#x20;                |                     |

\&#x20;            App Server 1          App Server 2

\&#x20;                |                     |

\&#x20;                +----------+----------+

\&#x20;                           |

\&#x20;                +----------+----------+

\&#x20;                |                     |

\&#x20;            Redis Cache          Message Queue

\&#x20;                |                     |

\&#x20;                |                 Background Worker

\&#x20;                |                     |

\&#x20;                +----------+----------+

\&#x20;                           |

\&#x20;                    Primary Database

\&#x20;                           |

\&#x20;                      Read Replica

```



\### Component Responsibilities



\- \*\*DNS:\*\* Directs users to the application’s domain.

\- \*\*CDN:\*\* Delivers static files such as CSS, JavaScript, and images from locations closer to users. Private note contents should not be publicly cached.

\- \*\*Load balancer:\*\* Distributes incoming requests across healthy application servers.

\- \*\*Application servers:\*\* Authenticate users, validate requests, enforce note ownership, and implement API operations. They remain stateless so requests can reach any healthy server.

\- \*\*Redis cache:\*\* Stores frequently accessed data to reduce repeated database reads. Cached note lists must be invalidated or updated after relevant changes.

\- \*\*Primary database:\*\* Stores authoritative user, note, and tag records and handles writes.

\- \*\*Read replica:\*\* Serves suitable read requests to reduce pressure on the primary database. Replication delay may mean that some recent changes are not immediately visible there.

\- \*\*Message queue:\*\* Holds background jobs, such as search indexing or analytics, so they do not delay normal API responses.

\- \*\*Background worker:\*\* Processes queued jobs independently of web requests.



\## 5. Step-by-Step Photo Upload Flow



SnapShare separates photo storage from image processing so that users can upload photos without waiting for every thumbnail to finish generating.



1\. \*\*Client initiates upload:\*\* The user selects a photo. The client sends an authenticated request to the application server to initiate the upload.

2\. \*\*Authentication and validation:\*\* The application verifies the user's identity, checks upload permissions, and validates the file size and allowed image formats.

3\. \*\*Upload to object storage:\*\* The application issues a short-lived, authorized upload URL. The client uploads the original image directly to object storage, reducing bandwidth and processing pressure on the application servers.

4\. \*\*Create the database record:\*\* After the upload succeeds, the application creates a photo record in the relational database containing the photo ID, user ID, object key, dimensions, file size, and processing status.

5\. \*\*Enqueue a background job:\*\* The application publishes a thumbnail-generation job to the message queue. The job contains the photo ID and object key, not the entire image binary.

6\. \*\*Process the image:\*\* A background worker consumes the job, retrieves the original image from object storage, generates the required thumbnail and resized variants, and saves them back to object storage.

7\. \*\*Update processing status:\*\* The worker updates the database record to indicate that processing has completed and records the object keys for the generated variants. If processing fails, the job can be retried safely, with repeated attempts prevented from creating duplicate results.

8\. \*\*Deliver the photo:\*\* The application returns photo metadata and authorized image URLs to the client. The CDN can serve eligible resized images to viewers, reducing repeated requests to the origin storage.



\### Failure Handling



The database and object store do not normally share a single atomic transaction. If an upload succeeds but creating the database record fails, the system should retry or clean up the orphaned object. If publishing a queue job fails after the database write, a transactional outbox or retry mechanism can ensure the job is eventually published. Failed jobs should be retried with limits and moved to a dead-letter queue for investigation when necessary.



The photo record should distinguish between states such as `uploading`, `processing`, `completed`, and `failed`, so clients can understand the current status.



\## 6. Architectural Trade-Offs



\### Trade-Off 1: Synchronous vs. Asynchronous Thumbnail Generation



\*\*Synchronous processing\*\* generates thumbnails during the original upload request. Its advantage is that the resized images are ready before the request completes. However, image processing increases response time and consumes application resources. During peak upload traffic, this can exhaust application workers and reduce the number of requests the system can handle.



\*\*Asynchronous processing\*\* stores the original image first and sends a job to a message queue. Background workers generate thumbnails independently. This keeps uploads responsive and allows worker capacity to scale separately. The disadvantage is that thumbnails may not be available immediately, and the queue requires monitoring and retry handling.



\*\*Decision:\*\* SnapShare uses asynchronous thumbnail generation because it separates expensive image processing from the user-facing upload request and handles bursts more effectively.



\### Trade-Off 2: Primary Database vs. Read Replicas



The primary database handles writes and provides the authoritative record of each photo. Read replicas can serve feed and metadata queries, reducing read pressure on the primary database.



However, replication is often asynchronous. A newly uploaded photo may exist in the primary database before it appears on a replica. A user who immediately refreshes their feed could temporarily fail to see the photo.



\*\*Decision:\*\* Use the primary database for writes and read replicas for suitable high-volume reads. For read-after-write operations, read from the primary database or use a consistency strategy that ensures the new record is visible before relying on a replica.



\### Trade-Off 3: Caching vs. Freshness



Redis and the CDN reduce repeated database queries and image transfers. This improves latency and reduces infrastructure load. However, cached feeds or image metadata may become stale after a photo is uploaded, updated, or deleted.



\*\*Decision:\*\* Invalidate affected feed-cache entries after writes, use appropriate expiration policies, and use versioned image URLs for updated image variants. Private images must have suitable authorization and caching rules.



\### Trade-Off 4: Object Storage vs. Database BLOBs



Storing image binaries in object storage keeps the relational database focused on compact, searchable metadata. This reduces pressure on database memory, query performance, and database backups.



The trade-off is that metadata and image files live in separate systems. Partial failures can create missing references or orphaned files.



\*\*Decision:\*\* Store image binaries in object storage and references in the relational database. Use retries, reconciliation jobs, and cleanup policies to handle partial failures.



\## 7. Conclusion



SnapShare uses stateless application servers behind a load balancer, a CDN for image delivery, Redis for frequently accessed data, a relational database for metadata, object storage for image binaries, and a queue with background workers for thumbnail generation.



The capacity estimates indicate approximately 116 peak uploads per second under the stated assumptions. The architecture addresses that load by separating upload handling from image processing and scaling application servers and workers independently.



The design balances responsiveness, consistency, reliability, and cost. Its effectiveness should be validated through load testing and monitoring of upload latency, application-server saturation, queue backlog, database performance, and storage growth.

