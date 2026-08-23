# syntax=docker/dockerfile:1.7

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci || npm install

COPY . .

ARG VITE_SERVER_URL
ARG VITE_SUPPORT_URL
ENV VITE_SERVER_URL=$VITE_SERVER_URL
ENV VITE_SUPPORT_URL=$VITE_SUPPORT_URL

RUN npm run build

FROM nginx:1.27-alpine AS runtime
RUN addgroup -S app && adduser -S -G app app

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget -qO- http://127.0.0.1:80/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
