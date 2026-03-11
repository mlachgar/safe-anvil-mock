FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json tsconfig.json ./
COPY src ./src
RUN npm ci && npm run build && npm prune --omit=dev
EXPOSE 8000
CMD ["node", "dist/app/index.js"]
