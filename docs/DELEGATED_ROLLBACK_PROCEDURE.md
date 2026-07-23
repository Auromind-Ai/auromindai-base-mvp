# Production Zero-Downtime Rollback & Disaster Recovery Procedure

## 1. Zero-Downtime Container Rollback
In the event of a deployment failure or regression in production:
```bash
# Rollback backend container to previous image tag
docker-compose -f docker-compose.yml rollback backend

# Or via Cloud Run / GCP Kubernetes Deployment
gcloud run services update-traffic auromindai-backend --to-revisions=PREVIOUS_REVISION=100
```

## 2. PostgreSQL Alembic Database Migration Rollback
If a database migration caused issues:
```bash
# Revert 1 migration step down
cd backend
alembic downgrade -1
```

## 3. Redis State & Cache Flush Protocol
If invalidated session tokens or corrupted rate-limit keys persist:
```bash
# Clear OAuth state keys only
redis-cli --eval "return redis.call('del', unpack(redis.call('keys', 'oauth_state:*')))"

# Clear invalid impersonation session keys
redis-cli --eval "return redis.call('del', unpack(redis.call('keys', 'impersonation:*')))"
```
