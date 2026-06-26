# Stage 1: Build both binaries
FROM golang:1.26-alpine AS builder

RUN apk add --no-cache gcc musl-dev

WORKDIR /app

# Cache dependencies first
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build both binaries
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/bin/api  ./cmd/api   && \
    CGO_ENABLED=0 GOOS=linux go build -o /app/bin/worker ./cmd/worker

# Stage 2: Runtime — minimal alpine image
FROM alpine:3.21

RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

COPY --from=builder /app/bin/api     ./api
COPY --from=builder /app/bin/worker  ./worker
COPY --from=builder /app/migrations  ./migrations

EXPOSE 8080

# Default — override at deploy time for the worker service
CMD ["./api"]
