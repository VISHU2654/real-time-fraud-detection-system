@echo off
echo.

IF NOT EXIST ".env" (
    echo [STEP 1/3] .env file not found. Creating from .env.example...
    copy .env.example .env
) ELSE (
    echo [STEP 1/3] .env file exists.
)

echo.
echo [STEP 2/3] Stopping all containers and DELETING ALL DATA (MongoDB, Redis)...
docker-compose down -v

echo.
echo [STEP 3/3] Building and starting all 9 services in the background...
docker-compose up -d --build

echo.
echo SUCCESS! All services are starting up.
echo.
echo =======================================================
echo Services Available:
echo - Analyst Console : http://localhost:3000
echo - API Server      : http://localhost:4000
echo - Prometheus      : http://localhost:9090
echo - Grafana         : http://localhost:3001
echo =======================================================
echo.
echo Note: Health checks are active. It may take 30-40 seconds for all services 
echo to become fully healthy (MongoDB, Kafka, and Redis initialization).
echo.
echo You can run 'docker-compose logs -f' in your terminal to watch the logs.
echo.
pause