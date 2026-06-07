package templates

import (
	"bytes"
	"fmt"
	"regexp"
	"text/template"
)

// dotNotationPattern matches {{path.to.field}} (no leading dot) and captures
// the full dotted path. It ignores {{.dotted}} (already has a dot) and
// {{index .x "y"}} (starts with a keyword).
//
// Capture groups:
//
//	$1 — whitespace after {{
//	$2 — the dotted path (e.g. subscriber.firstName)
//	$3 — whitespace before }}
var dotNotationPattern = regexp.MustCompile(`\{\{(\s*)([a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)+)(\s*)\}\}`)

// preprocessDotNotation converts {{subscriber.firstName}} into {{.subscriber.firstName}}
// so that Go's text/template can resolve it via a nested map context.
func preprocessDotNotation(tmpl string) string {
	return dotNotationPattern.ReplaceAllString(tmpl, "{{$1.$2$4}}")
}

// RenderedTemplate holds the output of rendering a template with variables.
type RenderedTemplate struct {
	Subject string
	Body    string
}

// Render applies the given variables to the template's subject and body.
//
// Variables use {{subscriber.firstName}} dot-notation which is preprocessed
// into Go text/template syntax before execution. The vars map must be a
// nested structure matching the paths (e.g. {"subscriber": {"firstName": "John"}}).
func Render(subject, body string, vars map[string]any) (RenderedTemplate, error) {
	renderedBody, err := renderString(body, vars)
	if err != nil {
		return RenderedTemplate{}, fmt.Errorf("rendering body: %w", err)
	}

	renderedSubject := ""
	if subject != "" {
		renderedSubject, err = renderString(subject, vars)
		if err != nil {
			return RenderedTemplate{}, fmt.Errorf("rendering subject: %w", err)
		}
	}

	return RenderedTemplate{Subject: renderedSubject, Body: renderedBody}, nil
}

func renderString(tmpl string, vars map[string]any) (string, error) {
	// Preprocess dot-notation to Go template syntax
	processed := preprocessDotNotation(tmpl)

	t, err := template.New("").Option("missingkey=error").Parse(processed)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, vars); err != nil {
		return "", err
	}
	return buf.String(), nil
}
