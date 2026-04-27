package templates

import (
	"bytes"
	"fmt"
	"text/template"
)

// RenderedTemplate holds the output of rendering a template with variables.
type RenderedTemplate struct {
	Subject string
	Body    string
}

// Render applies the given variables to the template's subject and body.
// Variables are substituted using Go's text/template syntax: {{.VarName}}.
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
	t, err := template.New("").Option("missingkey=error").Parse(tmpl)
	if err != nil {
		return "", err
	}
	var buf bytes.Buffer
	if err := t.Execute(&buf, vars); err != nil {
		return "", err
	}
	return buf.String(), nil
}
