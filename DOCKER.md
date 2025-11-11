# Docker Deployment Guide

This guide covers how to deploy the Bill Splitter application using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or later)
- Docker Compose (version 2.0 or later)
- At least 2GB of available RAM
- At least 1GB of free disk space

## Quick Start

### Using Docker Compose (Recommended)

1. **Clone and navigate to the project:**
   ```bash
   git clone <repository-url>
   cd bill-splitter
   ```

2. **Build and start the application:**
   ```bash
   docker-compose up -d
   ```

3. **Verify the deployment:**
   ```bash
   curl http://localhost:3001/api/health
   ```

The application will be available at `http://localhost:3001`

### Using Docker Build Only

1. **Build the Docker image:**
   ```bash
   docker build -t bill-splitter .
   ```

2. **Run Redis container (required):**
   ```bash
   docker run -d --name redis -p 6379:6379 redis:7-alpine
   ```

3. **Run the application:**
   ```bash
   docker run -d \
     --name bill-splitter \
     -p 3001:3001 \
     -e NODE_ENV=production \
     -e REDIS_HOST=host.docker.internal \
     -e REDIS_PORT=6379 \
     bill-splitter
   ```

## Docker Features

The Bill Splitter Docker deployment includes production-ready features:

- **Multi-stage builds** for optimized production images
- **PM2 process management** with cluster mode for automatic scaling
- **Health checks** for both application and Redis
- **Persistent data storage** with Redis volumes
- **Non-root user** for enhanced security
- **Comprehensive logging** with structured output
- **Zero-downtime deployment** with PM2 reload capabilities
- **Automatic permissions handling** for log bind mounts

### Permissions and Log Persistence

The application handles Docker bind mount permissions automatically:

- **Entrypoint Script**: `docker-entrypoint.sh` ensures logs directory has correct permissions
- **Non-root User**: Application runs as UID 1001 for security
- **Log Bind Mount**: `./logs:/app/server/logs:rw` persists logs to host
- **Automatic Fix**: Container startup fixes ownership issues with bind mounts

This prevents EACCES errors when PM2 tries to write log files in bind-mounted directories.

## PM2 Process Management

The application uses PM2 for production process management with the following benefits:

- **Cluster Mode**: Automatically utilizes all available CPU cores
- **Process Monitoring**: Automatic restarts on crashes
- **Memory Management**: Restarts processes when memory exceeds 1GB
- **Graceful Reload**: Zero-downtime updates with `pm2 reload`
- **Log Management**: Structured logging with rotation

### PM2 Configuration

The `ecosystem.config.js` file contains the PM2 configuration:

```javascript
{
  apps: [{
    name: 'bill-splitter',
    script: 'server/index.js',
    instances: 'max',        // Use all CPU cores
    exec_mode: 'cluster',    // Cluster mode for scaling
    max_memory_restart: '1G', // Restart on memory limit
    restart_delay: 4000,     // Delay between restarts
    max_restarts: 10,        // Max restart attempts
    min_uptime: '10s'        // Minimum uptime before considering stable
  }]
}
```

### Monitoring PM2 in Docker

```bash
# View PM2 processes
docker exec bill-splitter-app pm2 list

# View real-time monitoring
docker exec bill-splitter-app pm2 monit

# View logs
docker exec bill-splitter-app pm2 logs

# Restart gracefully
docker exec bill-splitter-app pm2 reload all
```

## Frontend Integration

The React frontend is built into the Docker image and served by the Express backend:

1. **Build Stage**: The React app is built to static files in `/client/dist`
2. **Production Stage**: Static files are copied to `/public` in the server
3. **Serving**: Express serves the frontend from `/public` at the root path

**Access Points:**
- `http://localhost:3001` - React frontend application
- `http://localhost:3001/api/*` - Backend API endpoints

This approach provides:
- Single container deployment (no separate frontend container needed)
- Production-optimized static file serving
- Simplified deployment and management
- Better performance (no proxy overhead)

## Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Key environment variables for Docker deployment:

- `NODE_ENV`: Set to `production` for deployment
- `REDIS_HOST`: Use `redis` when using Docker Compose, `host.docker.internal` for standalone Docker
- `REDIS_PORT`: Redis port (default: 6379)
- `ALLOWED_ORIGIN`: Set to your deployment URL (e.g., `http://localhost:3001`)

### Docker Compose Configuration

The `docker-compose.yml` file includes:

- **Redis Service**: Persistent data storage with volume mounting
- **Application Service**: Multi-stage build with PM2 process management
- **Network**: Isolated bridge network for service communication
- **Health Checks**: Automated health monitoring
- **Volume Persistence**: Redis data persists across container restarts

## Production Deployment

### Security Considerations

1. **Non-root User**: Application runs as non-root user (UID 1001)
2. **Minimal Base Image**: Uses Alpine Linux for reduced attack surface
3. **Resource Limits**: Configure memory and CPU limits in production
4. **Environment Variables**: Never commit sensitive data to version control

### Resource Limits

Add resource limits to `docker-compose.yml` for production:

```yaml
bill-splitter:
  # ... existing configuration
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 1G
      reservations:
        cpus: '0.5'
        memory: 512M
```

### Reverse Proxy Setup

For production, use a reverse proxy like Nginx:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Logs

### Viewing Logs

```bash
# Docker Compose logs
docker-compose logs -f bill-splitter

# Individual container logs
docker logs -f bill-splitter-app
docker logs -f bill-splitter-redis
```

### PM2 Monitoring

Access PM2 monitoring inside the container:

```bash
docker exec -it bill-splitter-app pm2 monit
docker exec -it bill-splitter-app pm2 logs
```

### Health Checks

Both services include health checks:

```bash
# Check health status
docker-compose ps

# Manual health check
curl http://localhost:3001/api/health
```

## Troubleshooting

### Common Issues

1. **Port Conflicts**: Ensure ports 3001 and 6379 are available
2. **Redis Connection**: Verify Redis is running and accessible
3. **Memory Issues**: Monitor memory usage and adjust limits if needed
4. **Build Failures**: Check Node.js version compatibility (requires Node.js 18+)

### Debug Commands

```bash
# Check container status
docker-compose ps

# Inspect container logs
docker-compose logs bill-splitter

# Execute commands in container
docker exec -it bill-splitter-app sh

# Restart services
docker-compose restart

# Rebuild and restart
docker-compose up -d --build
```

### Performance Optimization

1. **Enable BuildKit** for faster builds:
   ```bash
   DOCKER_BUILDKIT=1 docker-compose build
   ```

2. **Use .dockerignore** to exclude unnecessary files
3. **Multi-stage builds** reduce final image size
4. **PM2 Cluster Mode** utilizes multiple CPU cores automatically

## Cloud Deployment

The application is designed to work with any cloud provider that supports Docker containers:

### Supported Platforms

- **Docker**: Use the included Dockerfile for container deployment
- **Redis**: Requires external Redis service (AWS ElastiCache, Azure Redis, etc.)
- **Startup command**: `pm2-runtime start ecosystem.config.js --env production`
- **Environment variables**: Configure Redis connection for your cloud provider

### Process Management

The application uses PM2 for production process management with:
- Automatic clustering across CPU cores
- Zero-downtime deployments with `pm2 reload`
- Memory monitoring and automatic restarts
- Comprehensive logging and monitoring

Most cloud platforms work seamlessly with PM2's process management capabilities.

### Cloud-Specific Configuration

#### AWS ECS/Fargate
```yaml
# task definition example
{
  "containerDefinitions": [
    {
      "name": "bill-splitter",
      "image": "your-registry/bill-splitter:latest",
      "environment": [
        {"name": "NODE_ENV", "value": "production"},
        {"name": "REDIS_HOST", "value": "your-redis-cluster.xxx.cache.amazonaws.com"}
      ],
      "portMappings": [{"containerPort": 3001}],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/bill-splitter",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Azure Container Instances
```bash
# Deploy with Azure CLI
az container create \
  --resource-group bill-splitter-rg \
  --name bill-splitter \
  --image your-registry/bill-splitter:latest \
  --cpu 1 --memory 1 \
  --ports 3001 \
  --environment-variables \
    NODE_ENV=production \
    REDIS_HOST=your-redis.redis.cache.windows.net \
    REDIS_PORT=6380 \
    REDIS_PASSWORD=your-redis-password
```

#### Google Cloud Run
```bash
# Deploy with Cloud Run
gcloud run deploy bill-splitter \
  --image gcr.io/your-project/bill-splitter \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production,REDIS_HOST=your-redis-ip
```

## Scaling

### Horizontal Scaling

For multiple application instances:

```yaml
# In docker-compose.yml
bill-splitter:
  # ... existing configuration
  deploy:
    replicas: 3
```

### Redis Scaling

For high-availability Redis, consider Redis Cluster or Redis Sentinel.

## Backup and Recovery

### Data Backup

Backup Redis data:

```bash
# Create backup
docker exec bill-splitter-redis redis-cli BGSAVE
docker cp bill-splitter-redis:/data/dump.rdb ./redis-backup-$(date +%Y%m%d).rdb

# Restore backup
docker cp ./redis-backup-20231201.rdb bill-splitter-redis:/data/dump.rdb
docker restart bill-splitter-redis
```

### Application Backup

Backup application logs:

```bash
docker cp bill-splitter-app:/app/server/logs ./logs-backup-$(date +%Y%m%d)
```

## Updates and Maintenance

### Updating the Application

```bash
# Pull latest code
git pull

# Rebuild and restart
docker-compose down
docker-compose up -d --build
```

### Rolling Updates

For zero-downtime updates:

```bash
# Update one instance at a time
docker-compose up -d --no-deps bill-splitter --scale bill-splitter=2
docker-compose up -d --no-deps bill-splitter --scale bill-splitter=1
```

## Security Best Practices

1. **Regular Updates**: Keep Docker images and dependencies updated
2. **Network Isolation**: Use custom networks instead of default bridge
3. **Secrets Management**: Use Docker secrets or environment files
4. **Image Scanning**: Scan images for vulnerabilities
5. **Access Control**: Limit container capabilities and user permissions

## Environment-Specific Configurations

Configure environment-specific settings using environment variables in `.env` files or by modifying the `docker-compose.yml` directly for different environments.

For production deployments, ensure you:
- Set `NODE_ENV=production`
- Configure appropriate Redis connection settings
- Set resource limits
- Use HTTPS with a reverse proxy
- Configure appropriate logging levels
