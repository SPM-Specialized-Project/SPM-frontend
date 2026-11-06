FROM node:20-alpine AS builder

WORKDIR /app

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

# Serve the SPA and resolve direct visits to frontend routes.
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 3000
CMD ["nginx", "-g", "daemon off;"]
