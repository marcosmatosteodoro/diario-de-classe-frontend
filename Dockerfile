# Use the official Node.js 18 image as the base image
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json package-lock.json* ./


# Desabilita todos os scripts pós-instalação e instala dependências de produção
ENV HUSKY=0
ENV npm_config_ignore_scripts=true
RUN npm ci

# Copy the rest of the application code
COPY . .

# Origem do backend (sem /api, só servidor): o build exige a variável
ARG API_INTERNAL_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL

# ARG/ENV de NEXT_PUBLIC_MARCA — paridade com API_INTERNAL_URL (DEC-006-005 · demonstracao)
ARG NEXT_PUBLIC_MARCA
ENV NEXT_PUBLIC_MARCA=$NEXT_PUBLIC_MARCA

# Build the Next.js app
RUN npm run build

# Production image
FROM node:20-alpine AS runner
WORKDIR /app

# Copy only necessary files from builder
COPY --from=builder /app/package.json ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/next.config.mjs ./
# next.config.mjs importa este módulo; o next start o carrega em runtime
COPY --from=builder /app/src/utils/offlineContentSecurityPolicy.mjs ./src/utils/offlineContentSecurityPolicy.mjs
# COPY de marcas.mjs — paridade de teste (DEC-006-005 · demonstracao); Docker não é o caminho de publicação real (Vercel)
COPY --from=builder /app/src/utils/marcas.mjs ./src/utils/marcas.mjs
COPY --from=builder /app/next-env.d.ts ./
COPY --from=builder /app/jsconfig.json ./

# O next start carrega o next.config.mjs, que exige a variável em produção
ARG API_INTERNAL_URL
ENV API_INTERNAL_URL=$API_INTERNAL_URL

# ARG/ENV de NEXT_PUBLIC_MARCA — paridade com API_INTERNAL_URL (DEC-006-005 · demonstracao)
ARG NEXT_PUBLIC_MARCA
ENV NEXT_PUBLIC_MARCA=$NEXT_PUBLIC_MARCA

# Set environment variable for production
ENV NODE_ENV=production

# Expose port 3000
EXPOSE 3000

# Start the Next.js app
CMD ["npm", "start"]
