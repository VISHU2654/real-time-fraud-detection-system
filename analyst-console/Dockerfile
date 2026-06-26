# --- STAGE 1: Build the React App ---
FROM node:20 AS build

WORKDIR /usr/src/app

# Copy package.json (and package-lock.json if you have one)
COPY package*.json ./

# Install app dependencies
RUN npm install --timeout=1200000

# Copy all source code
COPY . .

# Create the optimized production build
RUN npm run build

# --- STAGE 2: Serve the App with Nginx ---
FROM nginx:1.27-alpine

# Copy the built files from Stage 1
COPY --from=build /usr/src/app/build /usr/share/nginx/html

# Nginx will automatically serve index.html on port 80
EXPOSE 80