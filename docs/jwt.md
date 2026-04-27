## 🧑‍💻 1. SIGNUP FLOW

## 1.1 Frontend

```text id="s1"
User enters:
- email
- password
- company name
```

---

## 1.2 Request

```http id="s2"
POST /auth/signup
```

```json id="s3"
{
  "email": "user@company.com",
  "password": "plain-text-password",
  "company_name": "Acme Inc"
}
```

---

## 1.3 Backend Flow (Go)

```text id="s4"
1. Validate input
2. Check if email exists
3. Hash password (bcrypt)
4. Create:
   - user
   - project (default workspace)
5. Generate API key (for SDK usage)
6. Return success
```

---

## 1.4 DB writes

```sql id="s5"
users:
  id
  email
  password_hash

projects:
  id
  user_id
  name
```

---

## 1.5 Response

```json id="s6"
{
  "user_id": "uuid",
  "project_id": "uuid"
}
```

---

# 🔑 2. SIGNIN FLOW

## 2.1 Frontend

```text id="s7"
User enters email + password
```

---

## 2.2 Request

```http id="s8"
POST /auth/signin
```

```json id="s9"
{
  "email": "user@company.com",
  "password": "password"
}
```

---

## 2.3 Backend Flow

```text id="s10"
1. Fetch user by email
2. Compare bcrypt password
3. If valid:
    → generate JWT access token
    → optionally generate refresh token
```

---

# 🔐 3. JWT CREATION (CORE PART)

Using github.com/golang-jwt/jwt:

## Claims

```go id="s11"
type Claims struct {
	UserID    string
	ProjectID string
	Role      string
	jwt.RegisteredClaims
}
```

---

## Token generation

```go id="s12"
func GenerateJWT(userID, projectID, role string) (string, error) {
	claims := Claims{
		UserID:    userID,
		ProjectID: projectID,
		Role:      role,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(15 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}
```

---

## 2 tokens returned:

```json id="s13"
{
  "access_token": "jwt...",
  "refresh_token": "random-string"
}
```

---

# 🔄 4. REFRESH TOKEN FLOW

## 4.1 Why needed

Access token expires quickly (security)

---

## 4.2 DB table

```sql id="s14"
refresh_tokens (
  id,
  user_id,
  token_hash,
  expires_at
)
```

---

## 4.3 Refresh request

```http id="s15"
POST /auth/refresh
```

```json id="s16"
{
  "refresh_token": "abc123"
}
```

---

## 4.4 Backend logic

```text id="s17"
1. Validate refresh token (DB lookup)
2. Check expiry
3. If valid:
    → issue new JWT access token
    → rotate refresh token (recommended)
```

---

# 🚪 5. SIGNOUT FLOW

```http id="s18"
POST /auth/logout
```

```text id="s19"
1. Delete refresh token from DB
2. Client deletes access token
```

---

# 🛡️ 6. AUTH MIDDLEWARE (EVERY REQUEST)

```go id="s20"
func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		tokenStr := extractBearer(r)

		token, err := jwt.ParseWithClaims(tokenStr, &Claims{}, func(token *jwt.Token) (any, error) {
			return jwtSecret, nil
		})

		if err != nil || !token.Valid {
			http.Error(w, "unauthorized", 401)
			return
		}

		claims := token.Claims.(*Claims)

		ctx := context.WithValue(r.Context(), "user_id", claims.UserID)
		ctx = context.WithValue(ctx, "project_id", claims.ProjectID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}
```

---

# 🔁 7. COMPLETE AUTH FLOW (END-TO-END)

## SIGNUP

```text id="s21"
Frontend → POST /signup
        → create user + project
        → return success
```

---

## SIGNIN

```text id="s22"
Frontend → POST /signin
        → verify password
        → issue JWT + refresh token
```

---

## API CALLS

```text id="s23"
Frontend → API request
        → JWT middleware validates
        → extracts project_id
        → executes request
```

---

## REFRESH

```text id="s24"
Frontend → token expired
        → POST /refresh
        → new JWT issued
```

---

# 🧠 8. How this connects to your notification system

This is where everything ties together:

## JWT gives you:

```text id="s25"
- user identity
- project_id (VERY IMPORTANT)
```

---

## That project_id is used for:

```text id="s26"
- SendGrid credentials
- Twilio credentials
- Templates
- Notifications
- Rate limits
```

---
