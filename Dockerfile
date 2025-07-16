# Use the official Node.js image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy TypeScript config and source code
COPY tsconfig.json ./
COPY src/ ./src/

# Build the TypeScript project
RUN npm run build

# Set environment variables
ENV NODE_ENV=production
ENV CRUD_API_URL=http://basiccrud:3000

# Run the compiled JavaScript
CMD ["node", "build/index.js"] 