package app

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/url"
	"strings"

	"github.com/deveasyclick/iwifunni/internal/auth"
	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/markbates/goth/gothic"
)

type authHandlerAdapter struct {
	svc             authServiceFull
	frontendBaseURL string
	socialProviders map[string]bool
	cookieSecure    bool
	queries         *db.Queries
}

type authServiceFull interface {
	Signup(ctx context.Context, input auth.SignupInput) (*auth.SignupResult, error)
	VerifyEmail(ctx context.Context, input auth.VerifyEmailInput) (*auth.VerifyEmailResult, error)
	SigninWithSocial(ctx context.Context, input auth.SocialSigninInput) (*auth.SocialSigninResult, error)
	Signin(ctx context.Context, input auth.SigninInput) (*auth.SigninResult, error)
	Refresh(ctx context.Context, input auth.RefreshInput) (*auth.RefreshResult, error)
	CompleteOnboarding(ctx context.Context, input auth.CompleteOnboardingInput) (*auth.CompleteOnboardingResult, error)
	Logout(ctx context.Context, input auth.LogoutInput) error
}

func (a *App) authHandler() *authHandlerAdapter {
	return &authHandlerAdapter{
		svc:             a.authService,
		frontendBaseURL: a.frontendBaseURL,
		socialProviders: a.socialProviders,
		cookieSecure:    a.cookieSecure,
		queries:         a.queries,
	}
}

func (h *authHandlerAdapter) signup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		FirstName  string `json:"first_name"`
		LastName   string `json:"last_name"`
		Email      string `json:"email"`
		Password   string `json:"password"`
		APIKeyName string `json:"api_key_name,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	result, err := h.svc.Signup(r.Context(), auth.SignupInput{
		FirstName:  req.FirstName,
		LastName:   req.LastName,
		Email:      req.Email,
		Password:   req.Password,
		APIKeyName: req.APIKeyName,
	})
	if err != nil {
		if errors.Is(err, auth.ErrEmailAlreadyExists) {
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

func (h *authHandlerAdapter) verifyEmail(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email string `json:"email"`
		Code  string `json:"code"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	result, err := h.svc.VerifyEmail(r.Context(), auth.VerifyEmailInput{
		Email: req.Email,
		Code:  req.Code,
	})
	if err != nil {
		if errors.Is(err, auth.ErrInvalidVerificationCode) || errors.Is(err, auth.ErrVerificationCodeExpired) {
			http.Error(w, err.Error(), http.StatusBadRequest)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *authHandlerAdapter) socialStart(w http.ResponseWriter, r *http.Request) {
	provider := strings.ToLower(strings.TrimSpace(chi.URLParam(r, "provider")))
	if !h.isConfiguredSocialProvider(provider) {
		http.Error(w, "social provider is not configured", http.StatusNotFound)
		return
	}

	gothic.BeginAuthHandler(w, r)
}

func (h *authHandlerAdapter) socialCallback(w http.ResponseWriter, r *http.Request) {
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

	result, err := h.svc.SigninWithSocial(r.Context(), auth.SocialSigninInput{
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

func (h *authHandlerAdapter) signin(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	result, err := h.svc.Signin(r.Context(), auth.SigninInput{Email: req.Email, Password: req.Password})
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			http.Error(w, err.Error(), http.StatusUnauthorized)
		} else if errors.Is(err, auth.ErrEmailNotVerified) {
			http.Error(w, err.Error(), http.StatusForbidden)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *authHandlerAdapter) completeOnboarding(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetJWTClaims(r.Context())
	if claims == nil {
		http.Error(w, "missing jwt claims", http.StatusUnauthorized)
		return
	}

	userID, err := uuid.Parse(claims.UserID)
	if err != nil {
		http.Error(w, "invalid jwt claims", http.StatusUnauthorized)
		return
	}

	var req struct {
		OrganizationName string `json:"organization_name"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	result, err := h.svc.CompleteOnboarding(r.Context(), auth.CompleteOnboardingInput{
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

func (h *authHandlerAdapter) me(w http.ResponseWriter, r *http.Request) {
	claims := auth.GetJWTClaims(r.Context())
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

func (h *authHandlerAdapter) refresh(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	result, err := h.svc.Refresh(r.Context(), auth.RefreshInput{RefreshToken: req.RefreshToken})
	if err != nil {
		if errors.Is(err, auth.ErrInvalidCredentials) {
			http.Error(w, err.Error(), http.StatusUnauthorized)
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
}

func (h *authHandlerAdapter) logout(w http.ResponseWriter, r *http.Request) {
	var req struct {
		RefreshToken string `json:"refresh_token"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}

	if err := h.svc.Logout(r.Context(), auth.LogoutInput{RefreshToken: req.RefreshToken}); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

func (h *authHandlerAdapter) writeSessionCookies(w http.ResponseWriter, result *auth.SocialSigninResult) {
	h.writeCookie(w, "access_token", result.AccessToken, 0)
	h.writeCookie(w, "refresh_token", result.RefreshToken, 0)
	if result.NeedsOnboarding {
		h.writeCookie(w, "needs_onboarding", "true", 0)
		return
	}
	h.clearCookie(w, "needs_onboarding")
}

func (h *authHandlerAdapter) writeCookie(w http.ResponseWriter, name, value string, maxAge int) {
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

func (h *authHandlerAdapter) clearCookie(w http.ResponseWriter, name string) {
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

func (h *authHandlerAdapter) redirectSocialError(w http.ResponseWriter, r *http.Request, message string) {
	target := strings.TrimRight(h.frontendBaseURL, "/") + "/auth/login?error=" + url.QueryEscape(message)
	http.Redirect(w, r, target, http.StatusTemporaryRedirect)
}

func (h *authHandlerAdapter) isConfiguredSocialProvider(provider string) bool {
	if h.socialProviders == nil {
		return false
	}
	return h.socialProviders[provider]
}
