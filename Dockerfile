# Stage 1: Build Next.js static export
FROM node:20-alpine AS frontend-builder
WORKDIR /app

# Build arguments for Next.js environment variables
ARG NEXT_PUBLIC_API_URL
ARG NEXTAUTH_SECRET

ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}
ENV NEXTAUTH_SECRET=${NEXTAUTH_SECRET}

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code and build Next.js static export
COPY . .
RUN npm run build

# Stage 2: Build Go single binary embedding frontend assets
FROM golang:1.25-alpine AS go-builder
WORKDIR /app

COPY go.mod main.go ./
COPY --from=frontend-builder /app/out ./out

RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o server main.go

# Stage 3: Minimal runtime container
FROM alpine:3.20 AS runner
WORKDIR /app

RUN apk add --no-cache ca-certificates tzdata

COPY --from=go-builder /app/server ./server

EXPOSE 8080
ENV PORT=8080

ENTRYPOINT ["./server"]
