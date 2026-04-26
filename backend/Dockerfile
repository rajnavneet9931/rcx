FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

# Keeps your source code unchanged, but lets Linux container resolve existing route filename case.
RUN if [ -f routes/userAuthroutes.js ] && [ ! -f routes/userAuthRoutes.js ]; then ln -s userAuthroutes.js routes/userAuthRoutes.js; fi

EXPOSE 5000
CMD ["npm", "start"]
