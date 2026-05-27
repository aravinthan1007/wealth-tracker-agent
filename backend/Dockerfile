FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --production || true
COPY . .
ENV PORT=3000
EXPOSE 3000
CMD ["node", "backend/server.js"]
