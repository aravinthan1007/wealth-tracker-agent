FROM node:18-alpine
WORKDIR /app
COPY index.js ./
RUN npm init -y && npm install express
EXPOSE 8001
CMD ["node", "index.js"]
