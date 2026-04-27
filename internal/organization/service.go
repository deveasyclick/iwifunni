package organization

import (
	"context"
	"time"

	"github.com/deveasyclick/iwifunni/internal/db"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type CreateInput struct {
	Name   string
	UserID uuid.UUID // becomes owner
}

type OrgResult struct {
	ID        uuid.UUID `json:"id"`
	Name      string    `json:"name"`
	Role      string    `json:"role,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

func (s *Service) Create(ctx context.Context, in CreateInput) (OrgResult, error) {
	orgID := uuid.New()
	org, err := s.repo.Create(ctx, orgID, in.Name)
	if err != nil {
		return OrgResult{}, err
	}

	// Add creator as owner
	now := pgtype.Timestamptz{Time: time.Now().UTC(), Valid: true}
	if err := s.repo.AddMember(ctx, db.CreateOrganizationMemberParams{
		ID:             uuid.New(),
		OrganizationID: orgID,
		UserID:         in.UserID,
		Role:           "owner",
		CreatedAt:      now,
	}); err != nil {
		return OrgResult{}, err
	}

	return OrgResult{ID: org.ID, Name: org.Name, Role: "owner", CreatedAt: org.CreatedAt.Time}, nil
}

func (s *Service) GetByID(ctx context.Context, id uuid.UUID) (OrgResult, error) {
	org, err := s.repo.GetByID(ctx, id)
	if err != nil {
		return OrgResult{}, err
	}
	return OrgResult{ID: org.ID, Name: org.Name, CreatedAt: org.CreatedAt.Time}, nil
}

func (s *Service) ListByUser(ctx context.Context, userID uuid.UUID) ([]OrgResult, error) {
	rows, err := s.repo.ListByUser(ctx, userID)
	if err != nil {
		return nil, err
	}
	out := make([]OrgResult, 0, len(rows))
	for _, r := range rows {
		out = append(out, OrgResult{ID: r.ID, Name: r.Name, CreatedAt: r.CreatedAt.Time})
	}
	return out, nil
}
