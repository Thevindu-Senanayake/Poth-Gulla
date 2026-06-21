FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

# Expose port 5173 to the Docker host
EXPOSE 5173

# The --host flag is strictly required for Vite to work inside Docker
CMD ["npm", "run", "dev", "--", "--host"]