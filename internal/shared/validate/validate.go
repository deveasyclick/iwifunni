// Package validate provides shared request decoding and validation helpers
// using go-playground/validator with structured field-level error responses.
package validate

import (
	"encoding/json"
	"net/http"
	"strings"
	"unicode"

	"github.com/go-playground/validator/v10"
)

var validate = validator.New()

// ValidationError holds structured validation error information.
type ValidationError struct {
	Message string            `json:"error"`
	Fields  map[string]string `json:"fields,omitempty"`
}

// Error implements the error interface.
func (e *ValidationError) Error() string {
	return e.Message
}

// Decode decodes the JSON request body into dst and validates it using struct
// tags. Returns a *ValidationError if decoding or validation fails.
func Decode(r *http.Request, dst any) error {
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return &ValidationError{Message: "invalid payload"}
	}
	if err := validate.Struct(dst); err != nil {
		return formatValidationError(err)
	}
	return nil
}

// DecodeAndRespond is a convenience wrapper around Decode that writes a JSON
// error response to w when validation fails. Returns true if the request is
// valid (decoded + passed validation).
func DecodeAndRespond(w http.ResponseWriter, r *http.Request, dst any) bool {
	if err := Decode(r, dst); err != nil {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusBadRequest)
		_ = json.NewEncoder(w).Encode(err)
		return false
	}
	return true
}

func formatValidationError(err error) *ValidationError {
	ve, ok := err.(validator.ValidationErrors)
	if !ok {
		return &ValidationError{Message: "invalid payload"}
	}

	vErr := &ValidationError{
		Message: "Validation failed",
		Fields:  make(map[string]string, len(ve)),
	}

	for _, fe := range ve {
		field := toSnakeCase(fe.Field())
		vErr.Fields[field] = validationMessage(fe)
	}

	return vErr
}

func validationMessage(fe validator.FieldError) string {
	switch fe.Tag() {
	case "required":
		return "is required"
	case "email":
		return "must be a valid email address"
	case "oneof":
		return "must be one of: " + fe.Param()
	case "min":
		return "must be at least " + fe.Param() + " characters"
	case "max":
		return "must be at most " + fe.Param() + " characters"
	case "url":
		return "must be a valid URL"
	case "gte":
		return "must be greater than or equal to " + fe.Param()
	case "lte":
		return "must be less than or equal to " + fe.Param()
	default:
		return "is invalid"
	}
}

// toSnakeCase converts PascalCase or camelCase to snake_case.
// e.g., "FirstName" -> "first_name", "TemplateID" -> "template_id"
func toSnakeCase(s string) string {
	var result strings.Builder
	for i, r := range s {
		if unicode.IsUpper(r) {
			if i > 0 {
				result.WriteRune('_')
			}
			result.WriteRune(unicode.ToLower(r))
		} else {
			result.WriteRune(r)
		}
	}
	return result.String()
}
