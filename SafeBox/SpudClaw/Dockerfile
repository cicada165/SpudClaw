FROM node:22-alpine

# Set environment to production
ENV NODE_ENV=production

# Create a system user and group named spud
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

# Install production dependencies only
RUN npm install --omit=dev

# Copy application code
COPY --chown=spud:spud src/ ./src/
COPY --chown=spud:spud README.md ./

# Default command
CMD ["npm", "start"]
