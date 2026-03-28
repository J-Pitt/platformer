FROM node:20-slim
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --production
COPY index.js .
EXPOSE 8080
CMD ["node", "index.js"]
