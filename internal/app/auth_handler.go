package app

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/deveasyclick/iwifunni/internal/auth"
)

type authHandlerAdapter struct {
	svc authServiceFull
}

type authServiceFull interface {
	Signup(ctx context.Context, input auth.SignupInput) (*auth.SignupResult, error)
	Signin(ctx context.Context, input auth.SigninInput) (*auth.SigninResult, error)
	Refresh(ctx context.Context, input auth.RefreshInput) (*auth.RefreshResult, error)
	Logout(ctx context.Context, input auth.LogoutInput) error
}

func (a *App) authHandler() *authHandlerAdapter {
	return &authHandlerAdapter{svc: a.authService}
}

func (h *authHandlerAdapter) signup(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Email       string `json:"email"`
		Password    string `json:"password"`
		ProjectName string `json:"project_name"`
		APIKeyName  string `json:"api_key_name,omitempty"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid payload", http.StatusBadRequest)
		return
	}
	result, err := h.svc.Signup(r.Context(), auth.SignupInput{
		Email:       req.Email,
		Password:    req.Password,
		ProjectName: req.ProjectName,
		APIKeyName:  req.APIKeyName,
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
		} else {
			http.Error(w, err.Error(), http.StatusBadRequest)
		}
		return
	}
	w.Header().Set("Content-Type", "application/json")
	_ = json.NewEncoder(w).Encode(result)
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
