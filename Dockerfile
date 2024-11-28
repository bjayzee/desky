# Use Node.js base image
FROM node:20.7.0

# Set the working directory inside the container
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install all dependencies (including devDependencies)
RUN npm install

# Copy the rest of the application files
COPY . .

# Install TypeScript globally for Docker
RUN npm install -g typescript

# Run the TypeScript build step
RUN npm run build

# Expose the application port
EXPOSE 5000

# Start the application
CMD ["npm", "start"]
