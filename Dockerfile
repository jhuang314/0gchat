FROM node:23-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json .

RUN npm install --verbose

COPY . .

EXPOSE 3000

ENTRYPOINT ["npm","run","dev"]
