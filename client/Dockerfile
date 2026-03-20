FROM node:24-alpine

WORKDIR /app

RUN corepack enable pnpm

COPY package*.json ./

RUN pnpm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host"]
