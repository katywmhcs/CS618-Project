# Stage 1: Build the React application
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# ✅ Build with a placeholder instead of a real URL
RUN npm run build -- --base=./ --emptyOutDir && \
    sed -i 's|import.meta.env.VITE_BACKEND_URL|"VITE_BACKEND_URL_PLACEHOLDER"|g' dist/assets/index-*.js

# Stage 2: Serve the application with Nginx
FROM nginx:1.27-alpine
# ✅ Copy the new entrypoint script and make it executable
COPY --from=builder /app/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# ✅ Set the entrypoint to run the script on container startup
ENTRYPOINT ["/entrypoint.sh"]