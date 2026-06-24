# Use official Bun image
ARG CURL_IMPERSONATE_VERSION=0.6.1
FROM oven/bun:1 AS base

# Create app directory
WORKDIR /app

ARG DEBIAN_FRONTEND=noninteractive
ARG TARGETARCH
ARG CURL_IMPERSONATE_VERSION

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    libcurl4 \
    libnss3 \
    nss-plugin-pem \
    zlib1g \
  && case "${TARGETARCH:-amd64}" in \
    amd64) CURL_IMPERSONATE_ARCH='x86_64-linux-gnu' ;; \
    arm64) CURL_IMPERSONATE_ARCH='aarch64-linux-gnu' ;; \
    *) echo "Unsupported TARGETARCH: ${TARGETARCH}" >&2; exit 1 ;; \
  esac \
  && curl -fsSL \
    "https://github.com/lwthiker/curl-impersonate/releases/download/v${CURL_IMPERSONATE_VERSION}/curl-impersonate-v${CURL_IMPERSONATE_VERSION}.${CURL_IMPERSONATE_ARCH}.tar.gz" \
    -o /tmp/curl-impersonate.tar.gz \
  && tar -xzf /tmp/curl-impersonate.tar.gz -C /usr/local/bin \
  && chmod +x /usr/local/bin/curl-impersonate-ff /usr/local/bin/curl_ff117 \
  && rm -f /tmp/curl-impersonate.tar.gz \
  && rm -rf /var/lib/apt/lists/*

ENV CURL_BIN=/usr/local/bin/curl-impersonate-ff

# Install dependencies
COPY package*.json bun.lock* ./
RUN bun install --frozen-lockfile

# Copy .env.prod file if it exists
COPY .env.prod .env.prod

# Copy source files
COPY . .

# Build TypeScript
RUN bun run build

# Run the app
CMD ["bun", "start"]
