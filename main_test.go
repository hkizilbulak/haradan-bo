package main

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(r *http.Request) (*http.Response, error) { return fn(r) }

func testResponse(status int, body string) *http.Response {
	return &http.Response{
		StatusCode: status,
		Header:     make(http.Header),
		Body:       io.NopCloser(strings.NewReader(body)),
	}
}

func TestMediaUploadRelayUsesBackendGrantAndReturnsOnlyAssetID(t *testing.T) {
	fileBody := "jpeg-test-body"
	const assetID = "11111111-1111-4111-8111-111111111111"
	client := &http.Client{
		Timeout: 5 * time.Second,
		Transport: roundTripFunc(func(r *http.Request) (*http.Response, error) {
			switch r.URL.Host {
			case "backend.test":
				if r.URL.Path != "/api/v1/admin/media/uploads" || r.Method != http.MethodPost {
					t.Fatalf("backend request=%s %s", r.Method, r.URL.Path)
				}
				if r.Header.Get("Authorization") != "Bearer test-access" {
					t.Fatalf("authorization=%q", r.Header.Get("Authorization"))
				}
				body := fmt.Sprintf(`{"assetId":%q,"upload":{"method":"PUT","url":"https://storage.test/upload","headers":{"Content-Type":"image/jpeg"}}}`, assetID)
				response := testResponse(http.StatusCreated, body)
				response.Header.Set("Content-Type", "application/json")
				return response, nil
			case "storage.test":
				if r.Method != http.MethodPut || r.URL.Path != "/upload" {
					t.Fatalf("storage request=%s %s", r.Method, r.URL.Path)
				}
				if r.Header.Get("Content-Type") != "image/jpeg" {
					t.Fatalf("storage content type=%q", r.Header.Get("Content-Type"))
				}
				got, _ := io.ReadAll(r.Body)
				if !bytes.Equal(got, []byte(fileBody)) {
					t.Fatalf("storage body=%q", got)
				}
				return testResponse(http.StatusOK, ""), nil
			default:
				t.Fatalf("unexpected host=%s", r.URL.Host)
				return nil, nil
			}
		}),
	}

	srv := &appServer{
		backendURL: "http://backend.test",
		client:     client,
	}
	req := httptest.NewRequest(http.MethodPost, "/api/bo/media-upload", strings.NewReader(fileBody))
	req.Header.Set("Content-Type", "image/jpeg")
	req.AddCookie(&http.Cookie{Name: accessTokenCookieName, Value: "test-access"})
	rec := httptest.NewRecorder()

	srv.handleMediaUploadRelay(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
	if strings.TrimSpace(rec.Body.String()) != `{"assetId":"`+assetID+`"}` {
		t.Fatalf("browser response=%s", rec.Body.String())
	}
	for _, forbidden := range []string{"upload", "url", "backblaze", "objectKey"} {
		if strings.Contains(rec.Body.String(), forbidden) {
			t.Fatalf("browser response leaks %q: %s", forbidden, rec.Body.String())
		}
	}
}

func TestMediaUploadRelayRejectsUnsupportedTypeBeforeInitiation(t *testing.T) {
	srv := &appServer{client: &http.Client{Timeout: time.Second}}
	req := httptest.NewRequest(http.MethodPost, "/api/bo/media-upload", strings.NewReader("gif"))
	req.Header.Set("Content-Type", "image/gif")
	rec := httptest.NewRecorder()

	srv.handleMediaUploadRelay(rec, req)

	if rec.Code != http.StatusUnprocessableEntity || !strings.Contains(rec.Body.String(), "JPEG, PNG veya WebP") {
		t.Fatalf("status=%d body=%s", rec.Code, rec.Body.String())
	}
}
