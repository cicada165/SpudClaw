FROM node:22-alpine

# Create a non-root user named spud
RUN addgroup -S spud && adduser -S spud -G spud

# Set working directory
WORKDIR /home/spud/app

# Pre-create workspace and ensure correct permissions
RUN mkdir -p /home/spud/app/workspace && \
    chown -R spud:spud /home/spud/app

# Copy package files
COPY --chown=spud:spud package*.json ./

# Switch to non-root user
USER spud

# Install dependencies
RUN npm install

# Copy application code
COPY --chown=spud:spud . .

# Default command
CMD ["npm", "start"]
