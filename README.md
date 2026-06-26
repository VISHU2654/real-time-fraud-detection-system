# Real-Time Fraud Detection System

A production-ready, distributed system for detecting fraudulent credit card transactions in real-time. Built with Node.js, React, Kafka, MongoDB, Redis, and PyTorch (ONNX).

## Features

### 1. System Overview Dashboard
Real-time system health and global metrics visualization.
![Dashboard](docs/screenshots/1-dashboard.png)

### 2. Action Required (Review Queue)
Flagged transactions awaiting manual analyst review with bulk-action capabilities.
![Review Queue](docs/screenshots/2-review-queue.png)

### 3. Real-Time Event Stream
Live feed of transactions streaming through the Kafka pipeline.
![Live Feed](docs/screenshots/3-live-feed.png)

### 4. Simulation Engine
Inject normal and fraudulent transactions into the stream for end-to-end testing.
![Simulation Engine](docs/screenshots/4-simulation-engine.png)

## Core Capabilities
- **Real-Time Streaming**: Handles high-throughput transaction events via Kafka.
- **Ensemble ML Pipeline**: Combines XGBoost for known fraud patterns with an Autoencoder for zero-day anomalies, both optimized with ONNX Runtime.
- **Caching & Feature Store**: Uses Redis pipelines to maintain sliding windows of user transaction history with ultra-low latency.
- **Analyst Console**: React dashboard with WebSockets (via polling in fallback) for live transaction monitoring and manual review.
- **Production Grade**: Structured JSON logging, Prometheus metrics, global error handling, RBAC, input validation (Zod), and robust retry-with-DLQ architecture.

## Getting Started

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local development)
- Python 3.10+ (for retraining ML models)

### Quick Start
1. Copy the environment template: `cp .env.example .env`
2. Update the `.env` file with secure values.
3. Start the infrastructure and services:
   ```bash
   docker-compose up -d
   ```
4. Access the Analyst Console at `http://localhost:3000`.

## Architecture
- **API Server** (`:4000`): Receives transactions, writes to DB, and publishes to Kafka.
- **Kafka Consumer** (`:4001`): Pulls events, engineers features with Redis, scores via ONNX, and updates DB.
- **Frontend** (`:3000`): React app for analysts.
- **Prometheus & Grafana** (`:9090`, `:3001`): Observability stack.

## License
MIT License
