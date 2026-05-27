FROM node:18-alpine
WORKDIR /app
COPY index.js ./
RUN npm init -y && npm install express node-fetch@2
EXPOSE 8003
CMD ["node", "index.js"]
