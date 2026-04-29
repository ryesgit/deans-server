FROM node:20-bookworm-slim

WORKDIR /app

ARG DATABASE_URL=postgresql://placeholder:placeholder@localhost:5432/placeholder
ENV DATABASE_URL=${DATABASE_URL}

COPY package*.json ./
RUN npm install

COPY . .

RUN npx prisma generate

ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

CMD ["sh", "-c", "npx prisma migrate deploy && node index.js"]
