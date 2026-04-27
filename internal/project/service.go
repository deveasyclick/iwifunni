package project

import (
	"context"
	"time"

	"github.com/google/uuid"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type ProjectResult struct {
	ID             uuid.UUID  `json:"id"`
	OrganizationID *uuid.UUID `json:"organization_id,omitempty"`
	Name           string     `json:"name"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func (s *Service) Create(ctx context.Context, orgID uuid.UUID, name string) (ProjectResult, error) {
	p, err := s.repo.Create(ctx, orgID, name)
	if err != nil {
		return ProjectResult{}, err
	}
	result := ProjectResult{ID: p.ID, Name: p.Name, CreatedAt: p.CreatedAt.Time, UpdatedAt: p.UpdatedAt.Time}
	if p.OrganizationID.Valid {
		id := uuid.UUID(p.OrganizationID.Bytes)
		result.OrganizationID = &id
	}
	return result, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (ProjectResult, error) {
	p, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return ProjectResult{}, err
	}
	result := ProjectResult{ID: p.ID, Name: p.Name, CreatedAt: p.CreatedAt.Time, UpdatedAt: p.UpdatedAt.Time}
	if p.OrganizationID.Valid {
		id := uuid.UUID(p.OrganizationID.Bytes)
		result.OrganizationID = &id
	}
	return result, nil
}

func (s *Service) ListByOrganization(ctx context.Context, orgID uuid.UUID) ([]ProjectResult, error) {
	rows, err := s.repo.ListByOrganization(ctx, orgID)
	if err != nil {
		return nil, err
	}
	out := make([]ProjectResult, 0, len(rows))
	for _, r := range rows {
		p := ProjectResult{ID: r.ID, Name: r.Name, CreatedAt: r.CreatedAt.Time, UpdatedAt: r.UpdatedAt.Time}
		if r.OrganizationID.Valid {
			id := uuid.UUID(r.OrganizationID.Bytes)
			p.OrganizationID = &id
		}
		out = append(out, p)
	}
	return out, nil
}
