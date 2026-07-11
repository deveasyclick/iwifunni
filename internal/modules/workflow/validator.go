package workflow

import (
	"encoding/json"
	"strings"
	"time"

	"github.com/google/uuid"
)

var allowedConditionOperators = map[string]struct{}{
	"equals":     {},
	"not_equals": {},
	"contains":   {},
	"exists":     {},
}

func ValidateDefinition(definition Definition) error {
	if strings.TrimSpace(definition.Trigger.Event) == "" {
		return ErrInvalidWorkflow
	}
	if len(definition.Nodes) == 0 {
		return ErrInvalidWorkflow
	}

	nodesByID := make(map[string]Node, len(definition.Nodes))
	incomingEdges := make(map[string]int, len(definition.Nodes))
	adjacency := make(map[string][]string, len(definition.Nodes))

	for _, node := range definition.Nodes {
		nodeID := strings.TrimSpace(node.ID)
		if nodeID == "" {
			return ErrInvalidWorkflow
		}
		if _, exists := nodesByID[nodeID]; exists {
			return ErrInvalidWorkflow
		}
		node.ID = nodeID
		if err := validateNode(node); err != nil {
			return err
		}
		nodesByID[nodeID] = node
	}

	for _, edge := range definition.Edges {
		source := strings.TrimSpace(edge.Source)
		target := strings.TrimSpace(edge.Target)
		if source == "" || target == "" {
			return ErrInvalidWorkflow
		}
		if _, ok := nodesByID[source]; !ok {
			return ErrInvalidWorkflow
		}
		if _, ok := nodesByID[target]; !ok {
			return ErrInvalidWorkflow
		}
		adjacency[source] = append(adjacency[source], target)
		incomingEdges[target]++
	}

	hasStartNode := false
	for _, node := range definition.Nodes {
		if incomingEdges[node.ID] == 0 {
			hasStartNode = true
			break
		}
	}
	if !hasStartNode {
		return ErrInvalidWorkflow
	}

	if hasCycle(adjacency) {
		return ErrInvalidWorkflow
	}

	return nil
}

func validateNode(node Node) error {
	switch node.Type {
	case WorkflowStepTypeTrigger:
		return nil
	case WorkflowStepTypeNotification:
		var config NotificationConfig
		if err := json.Unmarshal(node.Config, &config); err != nil {
			return ErrInvalidWorkflow
		}
		channels, err := normalizeChannels(config.Channels)
		if err != nil || len(channels) != 1 {
			return ErrInvalidWorkflow
		}
		// Template ID is optional at definition time. It is set when the user
		// configures the channel editor and is required only at send time.
		if id := strings.TrimSpace(config.TemplateID); id != "" {
			if _, err := uuid.Parse(id); err != nil {
				return ErrInvalidWorkflow
			}
		}
		return nil
	case WorkflowStepTypeDelay:
		var config DelayConfig
		if err := json.Unmarshal(node.Config, &config); err != nil {
			return ErrInvalidWorkflow
		}
		if _, err := time.ParseDuration(strings.TrimSpace(config.Duration)); err != nil {
			return ErrInvalidWorkflow
		}
		return nil
	case WorkflowStepTypeCondition:
		var config ConditionConfig
		if err := json.Unmarshal(node.Config, &config); err != nil {
			return ErrInvalidWorkflow
		}
		if strings.TrimSpace(config.Field) == "" {
			return ErrInvalidWorkflow
		}
		if _, ok := allowedConditionOperators[strings.ToLower(strings.TrimSpace(config.Operator))]; !ok {
			return ErrInvalidWorkflow
		}
		return nil
	default:
		return ErrInvalidWorkflow
	}
}

func hasCycle(adjacency map[string][]string) bool {
	visiting := make(map[string]bool, len(adjacency))
	visited := make(map[string]bool, len(adjacency))

	var visit func(string) bool
	visit = func(node string) bool {
		if visited[node] {
			return false
		}
		if visiting[node] {
			return true
		}

		visiting[node] = true
		for _, next := range adjacency[node] {
			if visit(next) {
				return true
			}
		}
		visiting[node] = false
		visited[node] = true
		return false
	}

	for node := range adjacency {
		if visit(node) {
			return true
		}
	}

	return false
}
