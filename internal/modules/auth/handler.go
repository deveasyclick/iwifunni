package auth

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/db/gen"
	"github.com/deveasyclick/iwifunni/internal/shared/validate"
	"github.com/deveasyclick/iwifunni/internal/shared/authctx"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/markbates/goth/gothic"
)

// Handler is the HTTP handler for authentication endpoints.
type Handler struct {
	svc             HandlerService
	frontendBaseURL string
	socialProviders map[string]bool
	cookieSecure    bool
	queries         *db.Queries
}

// Config carries App-level configuration for the auth handler.
type Config struct {
	FrontendBaseURL string
	SocialProviders map[string]bool
	CookieSecure    bool
	Queries         *db.Queries
}

// NewHandler creates a new auth handler.
func NewHandler(svc HandlerService, cfg Config) *Handler {
	return &Handler{
		svc:             svc,
		frontendBaseURL: cfg.FrontendBaseURL,
		socialProviders: cfg.SocialProviders,
		cookieSecure:    cfg.CookieSecure,
		queries:         cfg.Queries,
	}
}

// Register registers all auth routes on the given router.
func (h *Handler) Register(r chi.Router) {
	r.Post("/auth/signup", h.signup)
	r.Post("/auth/verify-email", h.verifyEmail)
	r.Post("/auth/resend-verification", h.resendVerification)
	r.Post("/auth/forgot-password", h.forgotPassword)
	r.Post("/auth/verify-reset-code", h.verifyResetCode)
	r.Post("/auth/reset-password", h.resetPassword)
	r.Post("/auth/signin", h.signin)
	r.Post("/auth/refresh", h.refresh)
	r.Post("/auth/logout", h.logout)
	r.Get("/auth/social/{provider}", h.socialStart)
	r.Get("/auth/social/{provider}/callback", h.socialCallback)
}

// RegisterProtectedRoutes registers auth routes that require JWT authentication.
func (h *Handler) RegisterProtectedRoutes(r chi.Router) {
	r.Get("/auth/me", h.me)
	r.Post("/auth/onboarding", h.completeOnboarding)
}

type signupRequest struct {
	FirstName  string `json:"first_name" validate:"required"`
	LastName   string `json:"last_name" validate:"required"`
	Email      string `json:"email" validate:"required,email"`
	Password   string `json:"password" validate:"required,min=8"`
	APIKeyName string `json:"api_key_name,omitempty"`
}

// @Summary      Sign up
// @Description  Create a new account with a project and API key
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body  signupRequest  true  "Signup credentials"
// @Success      201   {object}  SignupResult
// @Failure      400   {string}  string  "Bad request"
// @Failure      409   {string}  string  "Email already exists"
// @Router       /auth/signup [post]
func (h *Handler) signup(w http.ResponseWriter, r *http.Request) {
	var req signupRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	result, err := h.svc.Signup(r.Context(), SignupInput{
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Email:      req.Email,
		Password:   req.Password,
		APIKeyName: req.APIKeyName,
	})
	if err != nil {
		if errors.Is(err, ErrEmailAlreadyExists) {
			http.Error(w, err.Error(), http.StatusConflict)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusCreated)
	_ = json.NewEncoder(w).Encode(result)
}

type verifyEmailRequest struct {
	Email string `json:"email" validate:"required,email"`
	Code  string `json:"code" validate:"required"`
}

// @Summary      Verify email
// @Description  Verify email address with code sent during signup
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body  verifyEmailRequest  true  "Verification code"
// @Success      200   {object}  map[string]any
// @Failure      400   {string}  string  "Invalid or expired code"
// @Router       /auth/verify-email [post]
func (h *Handler) verifyEmail(w http.ResponseWriter, r *http.Request) {
	var req verifyEmailRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	result, err := h.svc.VerifyEmail(r.Context(), VerifyEmailInput{
		Email: req.Email,
		Code:  req.Code,
	})
	if err != nil {
		if errors.Is(err, ErrInvalidVerificationCode) || errors.Is(err, ErrVerificationCodeExpired) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

type resendVerificationRequest struct {
	Email string `json:"email" validate:"required,email"`
}

// @Summary      Resend verification email
// @Description  Resend the email verification code
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body  resendVerificationRequest  true  "Email address"
// @Success      200   {object}  map[string]any
// @Failure      409   {string}  string  "Email already verified"
// @Router       /auth/resend-verification [post]
func (h *Handler) resendVerification(w http.ResponseWriter, r *http.Request) {
	var req resendVerificationRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	result, err := h.svc.ResendVerification(r.Context(), req.Email)
	if err != nil {
		if err.Error() == "email already verified" {
			http.Error(w, err.Error(), http.StatusConflict)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

type forgotPasswordRequest struct {
	Email string `json:"email" validate:"required,email"`
}

func (h *Handler) forgotPassword(w http.ResponseWriter, r *http.Request) {
	var req forgotPasswordRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	if err := h.svc.ForgotPassword(r.Context(), req.Email); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "If the email exists, a reset code has been sent."})
}

type verifyResetCodeRequest struct {
	Email string `json:"email" validate:"required,email"`
	Code  string `json:"code" validate:"required"`
}

func (h *Handler) verifyResetCode(w http.ResponseWriter, r *http.Request) {
	var req verifyResetCodeRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	if err := h.svc.VerifyResetCode(r.Context(), req.Email, req.Code); err != nil {
		if errors.Is(err, ErrInvalidVerificationCode) || errors.Is(err, ErrVerificationCodeExpired) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"status": "valid"})
}

type resetPasswordRequest struct {
	Email       string `json:"email" validate:"required,email"`
	Code        string `json:"code" validate:"required"`
	NewPassword string `json:"new_password" validate:"required,min=8"`
}

func (h *Handler) resetPassword(w http.ResponseWriter, r *http.Request) {
	var req resetPasswordRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}
	if err := h.svc.ResetPassword(r.Context(), req.Email, req.Code, req.NewPassword); err != nil {
		if errors.Is(err, ErrInvalidVerificationCode) || errors.Is(err, ErrVerificationCodeExpired) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]string{"message": "Password updated successfully."})
}

func (h *Handler) socialStart(w http.ResponseWriter, r *http.Request) {
	provider := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "provider")))
	if !h.isConfiguredSocialProvider(provider) {
		http.Error(w, "social provider is not configured", http.StatusNotFound)
		return
	}

	gothic.BeginAuthHandler(w, r)
}

func (h *Handler) socialCallback(w http.ResponseWriter, r *http.Request) {
	provider := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "provider")))
	if !h.isConfiguredSocialProvider(provider) {
		h.redirectSocialError(w, r, "social provider is not configured")
		return
	}

	socialUser, err := gothic.CompleteUserAuth(w, r)
	if err != nil {
		h.redirectSocialError(w, r, "unable to complete social sign in")
		return
	}
	_ = gothic.Logout(w, r)

	result, err := h.svc.SigninWithSocial(r.Context(), SocialSigninInput{
		Provider:       provider,
		ProviderUserID: socialUser.UserID,
		Email:          socialUser.Email,
		FirstName:      socialUser.FirstName,
		LastName:       socialUser.LastName,
		FullName:       socialUser.Name,
	})
	if err != nil {
		h.redirectSocialError(w, r, err.Error())
		return
	}

	h.writeSessionCookies(w, result)
	target := strings.TrimRight(h.frontendBaseURL, "/") + "/dashboard"
	if result.NeedsOnboarding {
		target = strings.TrimRight(h.frontendBaseURL, "/") + "/auth/onboarding"
	}
	http.Redirect(w, r, target, http.StatusTemporaryRedirect)
}

type signinRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

// @Summary      Sign in
// @Description  Authenticate with email and password
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body  signinRequest  true  "Signin credentials"
// @Success      200   {object}  AuthResult
// @Failure      401   {string}  string  "Invalid credentials"
// @Failure      403   {object}  map[string]string  "Email not verified"
// @Router       /auth/signin [post]
func (h *Handler) signin(w http.ResponseWriter, r *http.Request) {
	var req signinRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	result, err := h.svc.Signin(r.Context(), SigninInput{Email: req.Email, Password: req.Password})
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, err.Error(), http.StatusUnauthorized)
		} else if errors.Is(err, ErrEmailNotVerified) {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusForbidden)
			_ = json.NewEncoder(w).Encode(map[string]string{"error": err.Error(), "email": req.Email})
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

type completeOnboardingRequest struct {
	OrganizationName string `json:"organization_name" validate:"required"`
}

// @Summary      Complete onboarding
// @Description  Set up the user's organization after first sign in
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body  completeOnboardingRequest  true  "Organization name"
// @Success      200   {object}  CompleteOnboardingResult
// @Failure      401   {string}  string  "Unauthorized"
// @Router       /auth/onboarding [post]
// @Security     BearerAuth
func (h *Handler) completeOnboarding(w http.ResponseWriter, r *http.Request) {
	claims := authctx.GetJWTClaims(r.Context())
	if claims == nil {
		http.Error(w, "missing jwt claims", http.StatusUnauthorized)
		return
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		http.Error(w, "invalid jwt claims", http.StatusUnauthorized)
		return
	}

	var req completeOnboardingRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	result, err := h.svc.CompleteOnboarding(r.Context(), CompleteOnboardingInput{
		UserID:           userID,
		OrganizationName: req.OrganizationName,
	})
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

// @Summary      Get current user
// @Description  Get the authenticated user's profile
// @Tags         Auth
// @Produce      json
// @Success      200   {object}  map[string]any
// @Failure      401   {string}  string  "Unauthorized"
// @Router       /auth/me [get]
// @Security     BearerAuth
func (h *Handler) me(w http.ResponseWriter, r *http.Request) {
	claims := authctx.GetJWTClaims(r.Context())
	if claims == nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
		return
	}

	user, err := h.queries.GetUserByID(r.Context(), userID)
	if err != nil {
		http.Error(w, "user not found", http.StatusNotFound)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(map[string]any{
		"id":         user.ID,
		"email":      user.Email,
		"first_name": user.FirstName,
		"last_name":  user.LastName,
	})
}

type refreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

// @Summary      Refresh token
// @Description  Exchange a refresh token for a new access token
// @Tags         Auth
// @Accept       json
// @Produce      json
// @Param        body  body  refreshTokenRequest  true  "Refresh token"
// @Success      200   {object}  AuthResult
// @Failure      401   {string}  string  "Invalid refresh token"
// @Router       /auth/refresh [post]
func (h *Handler) refresh(w http.ResponseWriter, r *http.Request) {
	var req refreshTokenRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	result, err := h.svc.Refresh(r.Context(), RefreshInput{RefreshToken: req.RefreshToken})
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			http.Error(w, err.Error(), http.StatusUnauthorized)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

// @Summary      Logout
// @Description  Revoke a refresh token
// @Tags         Auth
// @Accept       json
// @Param        body  body  refreshTokenRequest  true  "Refresh token to revoke"
// @Success      204   {string}  string  "No content"
// @Failure      400   {string}  string  "Bad request"
// @Router       /auth/logout [post]
func (h *Handler) logout(w http.ResponseWriter, r *http.Request) {
	var req refreshTokenRequest
	if !validate.DecodeAndRespond(w, r, &req) {
		return
	}

	if err := h.svc.Logout(r.Context(), LogoutInput{RefreshToken: req.RefreshToken}); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *Handler) writeSessionCookies(w http.ResponseWriter, result *SocialSigninResult) {
	h.writeCookie(w, "access_token", result.AccessToken, 0)
	h.writeCookie(w, "refresh_token", result.RefreshToken, 0)
	if result.NeedsOnboarding {
		h.writeCookie(w, "needs_onboarding", "true", 0)
		return
	}
	h.clearCookie(w, "needs_onboarding")
}

func (h *Handler) writeCookie(w http.ResponseWriter, name, value string, maxAge int) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAge,
	})
}

func (h *Handler) clearCookie(w http.ResponseWriter, name string) {
	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   h.cookieSecure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func (h *Handler) redirectSocialError(w http.ResponseWriter, r *http.Request, message string) {
	target := strings.TrimRight(h.frontendBaseURL, "/") + "/auth/login?error=" + url.QueryEscape(message)
	http.Redirect(w, r, target, http.StatusTemporaryRedirect)
}

func (h *Handler) isConfiguredSocialProvider(provider string) bool {
	if h.socialProviders == nil {
		return false
	}
	return h.socialProviders[provider]
}
