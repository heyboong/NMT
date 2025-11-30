FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .

# Service listens on PORT env, default in app is 3001, so keep them consistent
ENV PORT=3001
EXPOSE 3001

CMD ["node", "p2p-rate-proxy.js"]
