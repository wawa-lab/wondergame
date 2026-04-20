FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install --prefer-offline || npm install
COPY src ./src
EXPOSE 8080
CMD ["node", "src/server.js"]
