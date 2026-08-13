# Build multi-etapa: imagen final pequeña con el server standalone de Next.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# El build no necesita BD (todas las páginas son dinámicas), pero Prisma sí
# valida que DATABASE_URL exista: se pasa una de mentira solo para compilar.
ENV DATABASE_URL="mysql://build:build@localhost:3306/build"
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production TZ=America/Mexico_City
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
