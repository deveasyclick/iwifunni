
# 🧠 1. What API keys are in your system

API keys represent:

```text id="a1"
PROJECT-level authentication for machines
NOT user login
```

So:

* JWT → humans (dashboard)
* API Key → machines (SDK, backend, scripts)

---

# 🏗️ 2. API KEY STRUCTURE

## Example format

```text id="a2"
nk_live_8f3Kx91AbcQz
nk_test_2d9LmnXyZpQr
```

---

## Meaning

```text id="a3"
nk       → namespace (your platform)
live/test→ environment
random   → secret
```

---

# 🗄️ 3. DATABASE DESIGN

```sql id="a4"
api_keys (
  id UUID,
  project_id UUID,

  name TEXT,
  key_hash TEXT,

  prefix TEXT, -- nk_live_8f3K...

  scopes JSONB, -- ["notifications:write"]

  last_used_at TIMESTAMP,

  revoked BOOLEAN DEFAULT false,

  created_at TIMESTAMP
)
```

---

# 🔐 4. KEY GENERATION FLOW (DASHBOARD)

## 4.1 User clicks:

```text id="a5"
Dashboard → Settings → API Keys → Create Key
```

---

## 4.2 Backend generates key

```go id="a6"
func GenerateAPIKey() (raw string, hash string) {
	raw = "nk_live_" + randomString(32)
	hash = bcryptHash(raw)
	return raw, hash
}
```

---

## 4.3 Store only hash

```text id="a7"
DB stores:
- hash
- prefix
- project_id
```

---

## 4.4 Return ONLY ONCE

```json id="a8"
{
  "api_key": "nk_live_8f3Kx91AbcQz"
}
```

👉 after this, key is NEVER shown again

---

# 📤 5. API REQUEST FLOW (SDK → YOUR SYSTEM)

Example:

```http id="a9"
POST /v1/notifications
Authorization: Bearer nk_live_8f3Kx91AbcQz
```

---

# ⚙️ 6. MIDDLEWARE FLOW (CRITICAL)

This is where everything happens.

---

## Step-by-step

```text id="a10"
1. Extract API key from header
2. Parse prefix (nk_live_xxx)
3. Lookup DB by prefix
4. Compare bcrypt hash
5. Check revoked flag
6. Load project_id into context
```

---

## Go middleware

```go id="a11"
func APIKeyMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		key := extractAPIKey(r)

		prefix := getPrefix(key)

		record := db.GetAPIKeyByPrefix(prefix)
		if record == nil || record.Revoked {
			http.Error(w, "unauthorized", 401)
			return
		}

		if !bcryptCompare(record.KeyHash, key) {
			http.Error(w, "unauthorized", 401)
			return
		}

		ctx := context.WithValue(r.Context(), "project_id", record.ProjectID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

---

# 🔁 7. REQUEST EXECUTION FLOW

After auth succeeds:

```text id="a12"
API Key → project_id resolved
        → rate limit applied
        → request processed
        → notification created
```

---

# 🚦 8. RATE LIMITING (VERY IMPORTANT)

Per API key:

```text id="a13"
100 requests / second
10k requests / day
```

Key-based limiter:

```go id="a14"
rateLimiter.Allow(apiKey)
```

---

# 🔐 9. SCOPES (PERMISSION SYSTEM)

Example:

```json id="a15"
{
  "scopes": [
    "notifications:write",
    "templates:read"
  ]
}
```

---

## Check in middleware:

```go id="a16"
if !hasScope(apiKey, "notifications:write") {
	return 403
}
```

---

# 🔄 10. FULL API KEY FLOW (END-TO-END)

## 1. CREATE KEY

```text id="a17"
Dashboard (JWT auth)
   ↓
POST /api-keys
   ↓
Generate key + hash
   ↓
Store in DB
   ↓
Return raw key once
```

---

## 2. USE KEY

```text id="a18"
SDK → request with API key
   ↓
Middleware:
   → lookup key
   → validate hash
   → attach project_id
```

---

## 3. EXECUTE REQUEST

```text id="a19"
project_id → used for:
   - SendGrid config
   - Twilio config
   - templates
   - rate limits
```

---

## 4. LOG USAGE

```text id="a20"
update api_keys.last_used_at
log request metrics
```

---
