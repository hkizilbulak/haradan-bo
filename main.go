package main

import (
	"embed"
	"io/fs"
	"log"
	"net/http"
	"os"
	"path"
	"strings"
)

//go:embed all:out
var content embed.FS

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	// Extract the 'out' subfolder from embedded filesystem
	subFS, err := fs.Sub(content, "out")
	if err != nil {
		log.Fatalf("Failed to create sub filesystem: %v", err)
	}

	fileServer := http.FileServer(http.FS(subFS))

	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		urlPath := strings.TrimPrefix(r.URL.Path, "/")
		if urlPath == "" {
			urlPath = "index.html"
		}

		// Handle /adverts -> /listings rewrite for adblock compatibility
		if strings.HasPrefix(urlPath, "adverts") {
			urlPath = strings.Replace(urlPath, "adverts", "listings", 1)
		}

		// Try opening exact file requested
		f, err := subFS.Open(urlPath)
		if err == nil {
			defer f.Close()
			fi, err := f.Stat()
			if err == nil && !fi.IsDir() {
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// Try opening [path].html
		htmlPath := urlPath + ".html"
		fHtml, err := subFS.Open(htmlPath)
		if err == nil {
			defer fHtml.Close()
			fi, err := fHtml.Stat()
			if err == nil && !fi.IsDir() {
				r.URL.Path = "/" + htmlPath
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// Try opening [path]/index.html
		indexPath := path.Join(urlPath, "index.html")
		fIndex, err := subFS.Open(indexPath)
		if err == nil {
			defer fIndex.Close()
			fi, err := fIndex.Stat()
			if err == nil && !fi.IsDir() {
				r.URL.Path = "/" + indexPath
				fileServer.ServeHTTP(w, r)
				return
			}
		}

		// Fallback to 404.html or index.html for SPA routing
		f404, err := subFS.Open("404.html")
		if err == nil {
			defer f404.Close()
			r.URL.Path = "/404.html"
			fileServer.ServeHTTP(w, r)
			return
		}

		r.URL.Path = "/index.html"
		fileServer.ServeHTTP(w, r)
	})

	log.Printf("Server starting on port %s...", port)
	if err := http.ListenAndServe(":"+port, nil); err != nil {
		log.Fatalf("Server failed to start: %v", err)
	}
}
