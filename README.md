# SpudClaw 🥔🛡️

SpudClaw is a security-hardened, autonomous AI agent designed to run on macOS (M1/M2/M3) with strict isolation and local intelligence.

## Architecture

- **Isolation**: Runs exclusively in a Docker container as a non-root user (`spud`).
- **Neural Bridge**: Routes all AI queries through a local **Omni-LLM** gateway (`localhost:4000`), air-gapping it from direct OpenAI access.
- **Persistence**: Long-term memory is stored in a localized `./workspace` directory, persisting through restarts and rebuilds.
- **SafeBox**: Deployed in a hardened directory structure to protect the host OS.

## Features

- **Web UI**: Modern chat interface accessible on port `18789`.
- **Persistent Memory**: Conversation history is saved to `chat_history.json`.
- **Real-time Diagnostics**: Visual indicators for Gateway, Internet, and DNS health.
- **Web Fetcher**: Ability to fetch and summarize URLs from within the secure environment.

## Deployment

### Prerequisites
1. **Omni-LLM Gateway**: Ensure your gateway is running on `localhost:4000`.
2. **Docker**: Docker Desktop must be running.

### Quick Start
1. **Navigate to the hardened directory**:
   ```bash
   cd SafeBox/SpudClaw
   ```

2. **Build and start the Fortress**:
   ```bash
   docker-compose up -d --build
   ```

3. **Verify Health**:
   ```bash
   ./check_status.sh
   ```

4. **Access the Agent**:
   Open [http://localhost:18789](http://localhost:18789) in your browser.

## Hardened Specifications
- **Base Image**: `node:22-alpine`
- **User**: `spud` (UID 1000)
- **Networking**: Bridge network with `host.docker.internal` mapping.
- **Security Mode**: `SANDBOX_MODE=strict`