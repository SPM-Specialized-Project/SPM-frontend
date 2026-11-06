FROM node:20-alpine AS builder

WORKDIR /app

ARG VITE_DATADOG_DASHBOARD_URL
ARG VITE_SENTRY_DASHBOARD_URL
ENV VITE_DATADOG_DASHBOARD_URL=$VITE_DATADOG_DASHBOARD_URL \
    VITE_SENTRY_DASHBOARD_URL=$VITE_SENTRY_DASHBOARD_URL

# Copy package manifest and lockfile first to leverage Docker layer caching
COPY package.json yarn.lock* ./

# Install dependencies using yarn (consistent with local dev)
RUN yarn install --frozen-lockfile --production=false

# Copy source and build the production assets
COPY . .
RUN yarn build

FROM nginx:stable-alpine

# Copy built static files from the builder stage
COPY --from=builder /app/dist /usr/share/nginx/html
COPY --from=builder /app/dist/observability-redirects.conf /etc/nginx/conf.d/spm-observability-redirects.conf

# Serve the SPA and redirect observability paths to provider dashboards.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
