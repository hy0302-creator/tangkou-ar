FROM node:22-alpine

WORKDIR /app

# 安装 sharp 需要的系统库
RUN apk add --no-cache python3 make g++ vips-dev

COPY package*.json ./
RUN npm ci --production

COPY . .

EXPOSE 3000

CMD ["node", "server/index.js"]
