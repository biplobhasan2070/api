# Use latest Node LTS
FROM node:20

WORKDIR /api

# Copy package files
COPY package.json package-lock.json* ./

RUN npm install

# Copy the rest of the code
COPY . .

EXPOSE 8080

CMD ["npm", "start"]
