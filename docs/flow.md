## 1. User Setup Phase

```text
1. User signs up
2. System generates API key
3. User configures:
   - Providers (e.g. :contentReference[oaicite:0]{index=0}, :contentReference[oaicite:1]{index=1})
   - Templates (email, SMS, push)
   - Notification types (optional mapping)
   - Webhook URL (optional)
   - Preferences (opt-in/out per channel)
```

---

## 2. Send Notification Request

```text
Client → POST /notifications
Headers: API_KEY
Body:
  - template_id OR notification_type
  - recipient (email/phone/device_id)
  - data (variables)
  - channel (optional)
  - idempotency_key (optional but recommended)
```

---

## 3. API Layer Processing

```text
1. Authenticate API key
2. Apply rate limiting (per API key)
3. Validate request:
   - template exists
   - required variables present
4. Check idempotency:
   - if key exists → return previous response
5. Create notification record:
   status = "PENDING"
```

---

## 4. Channel Resolution Logic

```text
IF channel is provided:
    use that channel
ELSE:
    resolve using:
        - user preferences (opt-in/out)
        - notification type rules
        - fallback order (push → email → SMS)
```

---

## 5. Template Resolution & Rendering

```text
1. Fetch template (latest or specified version)
2. Inject variables:
   "Hello {{name}}" → "Hello John"
3. Validate rendered output
4. Attach metadata:
   - template_version
   - channel
```

---

## 6. Queueing (Async Processing)

```text
Push message to queue:
{
  notification_id,
  channel,
  rendered_content,
  recipient,
  provider,
  retry_count = 0
}

Update status → "QUEUED"
```

---

## 7. Worker Processing

```text
Worker pulls message from queue

1. Select provider adapter:
   - Email → :contentReference[oaicite:2]{index=2}
   - SMS → :contentReference[oaicite:3]{index=3}

2. Send notification

IF success:
    status = "SENT"

IF failure:
    retry (exponential backoff)
    increment retry_count

IF max retries exceeded:
    status = "FAILED"
    move to dead-letter queue
```

---

## 8. Provider Webhook Handling

```text
Provider → POST /webhooks/provider

Events:
  - delivered
  - failed
  - bounced
  - opened (email)
  - clicked (optional)

System:
  → map provider response to internal format
  → update notification status
```

---

## 9. User Webhook (Outbound)

```text
IF user configured webhook:
    POST event to user

Payload:
{
  notification_id,
  status,
  channel,
  timestamp,
  metadata
}
```

---

## 10. Storage & Visibility

```text
Store:
  - notification metadata
  - status history
  - timestamps

User dashboard:
  - list notifications
  - filter (status, channel, date)
  - view delivery timeline
```

✔️ Yes — “users can see all notifications” **does make sense**, but:

* add pagination
* add retention limits

---

## 11. Multi-Channel Fallback Execution

```text
IF primary channel fails:
    try next channel in fallback order

Example:
    push fails → try email → try SMS

Track each attempt separately
```

---

## 12. Preferences & Opt-Out Enforcement

```text
Before sending:
    check recipient preferences

IF opted out:
    skip channel
    log as "SKIPPED"
```

---

## 13. Idempotency Handling

```text
IF duplicate request detected:
    return existing notification_id
    DO NOT resend
```

---

## 14. Template Versioning

```text
Each template has:
  - version_id
  - content
  - created_at

When sending:
  → lock to a specific version
```

---

## 15. Notification Lifecycle States (Very Important)

```text
PENDING → QUEUED → SENT → DELIVERED
                        ↘ FAILED
                        ↘ OPENED
                        ↘ CLICKED
```

Optional:

```text
SKIPPED (due to preferences)
RETRYING
```