FROM node:26-alpine AS base

FROM base AS deps
WORKDIR /app

COPY package.json package-lock.json* ./

RUN npm ci --no-audit --no-fund

FROM base AS builder
WORKDIR /app

# NEXT_PUBLIC_* are inlined at build time (runtime env in compose does not change them).
ARG NEXT_PUBLIC_DOTNET_API_URL
ARG NEXT_PUBLIC_OIDC_REDIRECT_URI
ARG NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI
ENV NEXT_PUBLIC_DOTNET_API_URL=${NEXT_PUBLIC_DOTNET_API_URL}
ENV NEXT_PUBLIC_OIDC_REDIRECT_URI=${NEXT_PUBLIC_OIDC_REDIRECT_URI}
ENV NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI=${NEXT_PUBLIC_OIDC_POST_LOGOUT_REDIRECT_URI}

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs
USER nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"] 
