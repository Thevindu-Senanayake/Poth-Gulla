FROM node:20-alpine

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy Prisma schema and generate the client
COPY prisma ./prisma/
RUN npx prisma generate

# We don't copy the rest of the code here because the docker-compose
# volume mount will handle it, keeping hot-reload active.

# Start the NestJS development server
CMD ["npm", "run", "start:dev"]