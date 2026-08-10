package main

import (
	"bufio"
	"bytes"
	"context"
	"embed"
	"encoding/json"
	"io"
	"io/fs"
	"log"
	"net/http"
	"net/url"
	"os"
	"path"
	"strings"
	"sync"
	"time"
)

func loadDotEnv(filename string) {
	file, err := os.Open(filename)
	if err != nil {
		return
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}
		parts := strings.SplitN(line, "=", 2)
		if len(parts) == 2 {
			key := strings.TrimSpace(parts[0])
			val := strings.Trim(strings.TrimSpace(parts[1]), `"'`)
			if os.Getenv(key) == "" {
				os.Setenv(key, val)
			}
		}
	}
}

//go:embed all:out
var content embed.FS

const (
	accessTokenCookieName  = "haradan_bo_access_token"
	refreshTokenCookieName = "haradan_bo_refresh_token"
	adminClientContext     = "ADMIN_BO"
	maxRelayedUploadBytes  = 64 << 20
)

type appServer struct {
	backendURL string
	client     *http.Client
	fileServer http.Handler
	subFS      fs.FS
	refreshMu  sync.Mutex
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type tokenResponse struct {
	AccessToken   string `json:"accessToken"`
	RefreshToken  string `json:"refreshToken"`
	TokenType     string `json:"tokenType"`
	ExpiresIn     int    `json:"expiresIn"`
	ClientContext string `json:"clientContext,omitempty"`
}

type refreshRequest struct {
	RefreshToken  string `json:"refreshToken"`
	ClientContext string `json:"clientContext"`
}

type myProfileResponse struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	EmailVerified bool    `json:"emailVerified"`
	FirstName     string  `json:"firstName"`
	LastName      string  `json:"lastName"`
	Phone         *string `json:"phone"`
	Role          string  `json:"role"`
	Status        string  `json:"status"`
}

type sessionResponse struct {
	User myProfileResponse `json:"user"`
}

type mediaUploadGrant struct {
	AssetID string `json:"assetId"`
	Upload  struct {
		Method  string            `json:"method"`
		URL     string            `json:"url"`
		Headers map[string]string `json:"headers"`
	} `json:"upload"`
}

type relayedMediaUploadResponse struct {
	AssetID string `json:"assetId"`
}

func main() {
	loadDotEnv(".env")
	loadDotEnv(".env.local")

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	subFS, err := fs.Sub(content, "out")
	if err != nil {
		log.Fatalf("Failed to create sub filesystem: %v", err)
	}

	server := &appServer{
		backendURL: resolveBackendURL(),
		client:     &http.Client{Timeout: 30 * time.Second},
		fileServer: http.FileServer(http.FS(subFS)),
		subFS:      subFS,
	}

	http.HandleFunc("/", server.handleRequest)

	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}

func resolveBackendURL() string {
	backendURL := strings.TrimRight(os.Getenv("BACKEND_API_URL"), "/")
	if backendURL == "" {
		backendURL = strings.TrimRight(os.Getenv("NEXT_PUBLIC_API_URL"), "/")
	}
	// Localhost fallback keeps local `go run` usable without env; production must set BACKEND_API_URL.
	// APP_ENV is unused here — do not invent environment detection.
	if backendURL == "" {
		backendURL = "http://localhost:3001"
		log.Printf("WARNING: BACKEND_API_URL not set; falling back to %s. Production must set BACKEND_API_URL.", backendURL)
	}
	return backendURL
}

// isAllowedCORSOrigin mirrors same-origin BO browser traffic and an optional
// comma-separated CORS_ALLOWED_ORIGINS allowlist. Arbitrary Origin reflection
// with credentials is rejected.
func isAllowedCORSOrigin(origin string, r *http.Request) bool {
	if origin == "" {
		return false
	}
	parsed, err := url.Parse(origin)
	if err != nil || parsed.Scheme == "" || parsed.Host == "" {
		return false
	}
	if strings.EqualFold(parsed.Host, r.Host) {
		return true
	}
	for _, raw := range strings.Split(os.Getenv("CORS_ALLOWED_ORIGINS"), ",") {
		allowed := strings.TrimSpace(raw)
		if allowed != "" && allowed == origin {
			return true
		}
	}
	return false
}

func (s *appServer) applyCORS(w http.ResponseWriter, r *http.Request) bool {
	origin := r.Header.Get("Origin")
	if origin == "" {
		return true
	}
	if !isAllowedCORSOrigin(origin, r) {
		return false
	}
	w.Header().Set("Access-Control-Allow-Origin", origin)
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Accept")
	w.Header().Set("Vary", "Origin")
	return true
}

func (s *appServer) handleRequest(w http.ResponseWriter, r *http.Request) {
	if r.Method == http.MethodOptions {
		if !s.applyCORS(w, r) {
			w.WriteHeader(http.StatusForbidden)
			return
		}
		w.WriteHeader(http.StatusOK)
		return
	}
	if !s.applyCORS(w, r) {
		// Non-preflight: continue without CORS headers (browser blocks cross-origin reads).
		// Same-origin BO traffic never needs reflected arbitrary origins.
	}

	if strings.HasPrefix(r.URL.Path, "/api/session") {
		s.handleSessionRequest(w, r)
		return
	}
	if r.URL.Path == "/api/bo/media-upload" {
		s.handleMediaUploadRelay(w, r)
		return
	}
	if strings.HasPrefix(r.URL.Path, "/api/") {
		s.handleAPIProxy(w, r)
		return
	}

	s.serveStatic(w, r)
}

// handleMediaUploadRelay performs only the provider PUT server-side. The BO
// browser stays same-origin, while initiation, confirmation and processing
// remain authoritative backend operations.
func (s *appServer) handleMediaUploadRelay(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	contentType := strings.ToLower(strings.TrimSpace(strings.Split(r.Header.Get("Content-Type"), ";")[0]))
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		writeJSONError(w, http.StatusUnprocessableEntity, "Yalnızca JPEG, PNG veya WebP görseller yüklenebilir.")
		return
	}
	if r.ContentLength > maxRelayedUploadBytes {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "Görsel izin verilen boyuttan büyük.")
		return
	}

	limited := http.MaxBytesReader(w, r.Body, maxRelayedUploadBytes)
	fileBytes, err := io.ReadAll(limited)
	if err != nil {
		writeJSONError(w, http.StatusRequestEntityTooLarge, "Görsel izin verilen boyuttan büyük.")
		return
	}
	if len(fileBytes) == 0 {
		writeJSONError(w, http.StatusUnprocessableEntity, "Yüklenecek görsel boş olamaz.")
		return
	}

	initiateBody, err := json.Marshal(map[string]any{
		"declaredContentType": contentType,
		"declaredByteSize":    len(fileBytes),
	})
	if err != nil {
		writeJSONError(w, http.StatusInternalServerError, "Görsel yükleme isteği hazırlanamadı.")
		return
	}
	response, responseBody, err := s.performAuthenticatedRequest(
		r.Context(), w, r, "/api/v1/admin/media/uploads", initiateBody,
	)
	if err != nil {
		writeJSONError(w, http.StatusBadGateway, "Görsel yükleme hizmetine ulaşılamadı. Lütfen tekrar deneyin.")
		return
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusCreated {
		writeBackendResponse(w, response, responseBody)
		return
	}

	var grant mediaUploadGrant
	if err := json.Unmarshal(responseBody, &grant); err != nil || grant.AssetID == "" {
		writeJSONError(w, http.StatusBadGateway, "Görsel yükleme izni alınamadı. Lütfen tekrar deneyin.")
		return
	}
	uploadURL, err := url.Parse(grant.Upload.URL)
	if err != nil || !isSafeProviderUploadURL(uploadURL) || !strings.EqualFold(grant.Upload.Method, http.MethodPut) {
		writeJSONError(w, http.StatusBadGateway, "Görsel yükleme izni geçersiz. Lütfen tekrar deneyin.")
		return
	}

	uploadRequest, err := http.NewRequestWithContext(r.Context(), http.MethodPut, uploadURL.String(), bytes.NewReader(fileBytes))
	if err != nil {
		writeJSONError(w, http.StatusBadGateway, "Görsel yükleme başlatılamadı. Lütfen tekrar deneyin.")
		return
	}
	for key, value := range grant.Upload.Headers {
		uploadRequest.Header.Set(key, value)
	}
	if uploadRequest.Header.Get("Content-Type") == "" {
		uploadRequest.Header.Set("Content-Type", contentType)
	}

	uploadClient := *s.client
	uploadClient.CheckRedirect = func(_ *http.Request, _ []*http.Request) error { return http.ErrUseLastResponse }
	uploadResponse, err := uploadClient.Do(uploadRequest)
	if err != nil {
		writeJSONError(w, http.StatusBadGateway, "Görsel depolama alanına yüklenemedi. Lütfen tekrar deneyin.")
		return
	}
	defer uploadResponse.Body.Close()
	_, _ = io.Copy(io.Discard, uploadResponse.Body)
	if uploadResponse.StatusCode < http.StatusOK || uploadResponse.StatusCode >= http.StatusMultipleChoices {
		writeJSONError(w, http.StatusBadGateway, "Görsel depolama alanına yüklenemedi. Lütfen tekrar deneyin.")
		return
	}

	writeJSON(w, http.StatusCreated, relayedMediaUploadResponse{AssetID: grant.AssetID})
}

func isSafeProviderUploadURL(target *url.URL) bool {
	if target == nil || target.Host == "" || target.User != nil {
		return false
	}
	if strings.EqualFold(target.Scheme, "https") {
		return true
	}
	host := strings.ToLower(target.Hostname())
	return strings.EqualFold(target.Scheme, "http") && (host == "localhost" || host == "127.0.0.1" || host == "::1")
}

func (s *appServer) handleSessionRequest(w http.ResponseWriter, r *http.Request) {
	switch r.URL.Path {
	case "/api/session":
		if r.Method != http.MethodGet {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		s.handleGetSession(w, r)
	case "/api/session/login":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		s.handleLogin(w, r)
	case "/api/session/logout":
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}
		s.handleLogout(w, r)
	default:
		http.NotFound(w, r)
	}
}

func (s *appServer) handleLogin(w http.ResponseWriter, r *http.Request) {
	var request loginRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, "Invalid login payload", http.StatusBadRequest)
		return
	}

	requestBody, err := json.Marshal(map[string]string{
		"email":         request.Email,
		"password":      request.Password,
		"clientContext": adminClientContext,
	})
	if err != nil {
		http.Error(w, "Failed to encode login payload", http.StatusInternalServerError)
		return
	}

	response, responseBody, err := s.doBackendJSONRequest(r.Context(), http.MethodPost, "/v1/auth/login", requestBody, "", nil)
	if err != nil {
		writeJSONError(w, http.StatusBadGateway, "Backend servisine erişilemiyor (502 Bad Gateway). Lütfen backend servisinin (haradan-be) çalıştığından emin olun.")
		return
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		writeBackendResponse(w, response, responseBody)
		return
	}

	var tokens tokenResponse
	if err := json.Unmarshal(responseBody, &tokens); err != nil {
		http.Error(w, "Invalid token response", http.StatusBadGateway)
		return
	}

	writeSessionCookies(w, r, tokens)

	profile, statusCode, err := s.fetchProfile(r.Context(), w, r, tokens.AccessToken)
	if err != nil {
		writeJSONError(w, statusCode, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, sessionResponse{User: *profile})
}

func (s *appServer) handleGetSession(w http.ResponseWriter, r *http.Request) {
	profile, statusCode, err := s.fetchProfile(r.Context(), w, r, readCookieValue(r, accessTokenCookieName))
	if err != nil {
		writeJSONError(w, statusCode, err.Error())
		return
	}

	writeJSON(w, http.StatusOK, sessionResponse{User: *profile})
}

func (s *appServer) handleLogout(w http.ResponseWriter, r *http.Request) {
	accessToken := readCookieValue(r, accessTokenCookieName)
	if accessToken != "" {
		response, _, err := s.doBackendJSONRequest(r.Context(), http.MethodPost, "/v1/auth/logout", []byte("{}"), accessToken, nil)
		if err == nil {
			response.Body.Close()
		}
	}

	clearSessionCookies(w, r)
	writeJSON(w, http.StatusOK, map[string]string{"message": "logged_out"})
}

func (s *appServer) handleAPIProxy(w http.ResponseWriter, r *http.Request) {
	requestBody, err := io.ReadAll(r.Body)
	if err != nil {
		http.Error(w, "Failed to read request body", http.StatusBadRequest)
		return
	}

	targetPath := r.URL.Path
	response, responseBody, err := s.performAuthenticatedRequest(r.Context(), w, r, targetPath, requestBody)
	if err != nil {
		http.Error(w, "Backend request failed", http.StatusBadGateway)
		return
	}
	defer response.Body.Close()

	writeBackendResponse(w, response, responseBody)
}

func (s *appServer) performAuthenticatedRequest(ctx context.Context, w http.ResponseWriter, r *http.Request, targetPath string, requestBody []byte) (*http.Response, []byte, error) {
	initialAccessToken := readCookieValue(r, accessTokenCookieName)
	response, responseBody, err := s.doBackendJSONRequest(ctx, r.Method, targetPath, requestBody, initialAccessToken, r.URL.Query())
	if err != nil {
		return nil, nil, err
	}

	if response.StatusCode != http.StatusUnauthorized {
		return response, responseBody, nil
	}

	s.refreshMu.Lock()
	defer s.refreshMu.Unlock()

	// Check if another concurrent request already refreshed token
	currentAccessToken := readCookieValue(r, accessTokenCookieName)
	if currentAccessToken != "" && currentAccessToken != initialAccessToken {
		response.Body.Close()
		return s.doBackendJSONRequest(ctx, r.Method, targetPath, requestBody, currentAccessToken, r.URL.Query())
	}

	refreshToken := readCookieValue(r, refreshTokenCookieName)
	if refreshToken == "" {
		return response, responseBody, nil
	}

	tokens, refreshErr := s.refreshSession(ctx, refreshToken)
	if refreshErr != nil {
		return response, responseBody, nil
	}

	response.Body.Close()
	writeSessionCookies(w, r, *tokens)
	return s.doBackendJSONRequest(ctx, r.Method, targetPath, requestBody, tokens.AccessToken, r.URL.Query())
}

func (s *appServer) refreshSession(ctx context.Context, refreshToken string) (*tokenResponse, error) {
	requestBody, err := json.Marshal(refreshRequest{
		RefreshToken:  refreshToken,
		ClientContext: adminClientContext,
	})
	if err != nil {
		return nil, err
	}

	response, responseBody, err := s.doBackendJSONRequest(ctx, http.MethodPost, "/v1/auth/refresh", requestBody, "", nil)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()

	if response.StatusCode != http.StatusOK {
		return nil, io.EOF
	}

	var tokens tokenResponse
	if err := json.Unmarshal(responseBody, &tokens); err != nil {
		return nil, err
	}

	return &tokens, nil
}

func (s *appServer) fetchProfile(ctx context.Context, w http.ResponseWriter, r *http.Request, accessToken string) (*myProfileResponse, int, error) {
	response, responseBody, err := s.doBackendJSONRequest(ctx, http.MethodGet, "/v1/me", nil, accessToken, nil)
	if err != nil {
		return nil, http.StatusBadGateway, err
	}
	defer response.Body.Close()

	if response.StatusCode == http.StatusUnauthorized {
		refreshToken := readCookieValue(r, refreshTokenCookieName)
		if refreshToken == "" {
			clearSessionCookies(w, r)
			return nil, http.StatusUnauthorized, io.EOF
		}

		tokens, refreshErr := s.refreshSession(ctx, refreshToken)
		if refreshErr != nil {
			clearSessionCookies(w, r)
			return nil, http.StatusUnauthorized, refreshErr
		}

		writeSessionCookies(w, r, *tokens)
		response, responseBody, err = s.doBackendJSONRequest(ctx, http.MethodGet, "/v1/me", nil, tokens.AccessToken, nil)
		if err != nil {
			return nil, http.StatusBadGateway, err
		}
		defer response.Body.Close()
	}

	if response.StatusCode != http.StatusOK {
		clearSessionCookies(w, r)
		return nil, response.StatusCode, io.EOF
	}

	var profile myProfileResponse
	if err := json.Unmarshal(responseBody, &profile); err != nil {
		return nil, http.StatusBadGateway, err
	}

	return &profile, http.StatusOK, nil
}

func (s *appServer) doBackendJSONRequest(ctx context.Context, method string, targetPath string, requestBody []byte, accessToken string, query url.Values) (*http.Response, []byte, error) {
	for strings.HasPrefix(targetPath, "/api/api/") {
		targetPath = strings.Replace(targetPath, "/api/api/", "/api/", 1)
	}
	if !strings.HasPrefix(targetPath, "/api/") && targetPath != "/api" {
		targetPath = "/api" + targetPath
	}
	targetURL, err := url.Parse(s.backendURL + targetPath)
	if err != nil {
		return nil, nil, err
	}
	if query != nil {
		targetURL.RawQuery = query.Encode()
	}

	request, err := http.NewRequestWithContext(ctx, method, targetURL.String(), bytes.NewReader(requestBody))
	if err != nil {
		return nil, nil, err
	}

	request.Header.Set("Accept", "application/json")
	request.Header.Set("Content-Type", "application/json")
	if accessToken != "" {
		request.Header.Set("Authorization", "Bearer "+accessToken)
	}

	response, err := s.client.Do(request)
	if err != nil {
		return nil, nil, err
	}

	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		response.Body.Close()
		return nil, nil, err
	}

	response.Body = io.NopCloser(bytes.NewReader(responseBody))
	return response, responseBody, nil
}

func (s *appServer) serveStatic(w http.ResponseWriter, r *http.Request) {
	urlPath := strings.TrimPrefix(r.URL.Path, "/")
	if urlPath == "" {
		urlPath = "index.html"
	}

	if strings.HasPrefix(urlPath, "adverts") {
		urlPath = strings.Replace(urlPath, "adverts", "listings", 1)
	}

	f, err := s.subFS.Open(urlPath)
	if err == nil {
		defer f.Close()
		fi, statErr := f.Stat()
		if statErr == nil && !fi.IsDir() {
			s.fileServer.ServeHTTP(w, r)
			return
		}
	}

	htmlPath := urlPath + ".html"
	fHTML, err := s.subFS.Open(htmlPath)
	if err == nil {
		defer fHTML.Close()
		fi, statErr := fHTML.Stat()
		if statErr == nil && !fi.IsDir() {
			r.URL.Path = "/" + htmlPath
			s.fileServer.ServeHTTP(w, r)
			return
		}
	}

	indexPath := path.Join(urlPath, "index.html")
	fIndex, err := s.subFS.Open(indexPath)
	if err == nil {
		defer fIndex.Close()
		fi, statErr := fIndex.Stat()
		if statErr == nil && !fi.IsDir() {
			r.URL.Path = "/" + indexPath
			s.fileServer.ServeHTTP(w, r)
			return
		}
	}

	f404, err := s.subFS.Open("404.html")
	if err == nil {
		defer f404.Close()
		r.URL.Path = "/404.html"
		s.fileServer.ServeHTTP(w, r)
		return
	}

	r.URL.Path = "/index.html"
	s.fileServer.ServeHTTP(w, r)
}

func writeSessionCookies(w http.ResponseWriter, r *http.Request, tokens tokenResponse) {
	secure := isSecureRequest(r)
	http.SetCookie(w, &http.Cookie{
		Name:     accessTokenCookieName,
		Value:    tokens.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   tokens.ExpiresIn,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    tokens.RefreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   60 * 60 * 24 * 30,
	})
}

func clearSessionCookies(w http.ResponseWriter, r *http.Request) {
	secure := isSecureRequest(r)
	http.SetCookie(w, &http.Cookie{
		Name:     accessTokenCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
	http.SetCookie(w, &http.Cookie{
		Name:     refreshTokenCookieName,
		Value:    "",
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   -1,
	})
}

func readCookieValue(r *http.Request, name string) string {
	cookie, err := r.Cookie(name)
	if err != nil {
		return ""
	}
	return cookie.Value
}

func isSecureRequest(r *http.Request) bool {
	return r.TLS != nil || strings.EqualFold(r.Header.Get("X-Forwarded-Proto"), "https")
}

func writeBackendResponse(w http.ResponseWriter, response *http.Response, responseBody []byte) {
	if contentType := response.Header.Get("Content-Type"); contentType != "" {
		w.Header().Set("Content-Type", contentType)
	}
	w.WriteHeader(response.StatusCode)
	_, _ = w.Write(responseBody)
}

func writeJSON(w http.ResponseWriter, statusCode int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeJSONError(w http.ResponseWriter, statusCode int, message string) {
	writeJSON(w, statusCode, map[string]string{"message": message})
}
