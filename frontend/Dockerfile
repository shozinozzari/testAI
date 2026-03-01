FROM node:20-alpine

WORKDIR /app

# Install dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci

# Copy the rest of the application.
COPY . .

EXPOSE 3000

# Use Next.js dev server for local docker-compose workflow.
CMD ["npm", "run", "dev", "--", "--hostname", "0.0.0.0", "--port", "3000"]
