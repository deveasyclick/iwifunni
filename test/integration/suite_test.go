package integration

import (
	"context"
	"log"
	"os"
	"testing"

	"github.com/deveasyclick/iwifunni/test/testutil"
)

var testApp *testutil.TestApp

// TestMain sets up the test infrastructure once for all tests.
func TestMain(m *testing.M) {
	ctx := context.Background()
	_ = ctx

	// Initialize the test database (creates if needed, runs migrations)
	if _, _, err := testutil.InitTestDB(); err != nil {
		log.Fatalf("failed to initialize test database: %v", err)
	}

	// Create the test application (wired with real DB + Redis)
	app, err := testutil.NewTestApp()
	if err != nil {
		log.Fatalf("failed to create test app: %v", err)
	}
	testApp = app

	// Run tests
	code := m.Run()

	// Cleanup
	testApp.Close()
	os.Exit(code)
}
