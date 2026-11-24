# Step-by-Step Commands for run : docker-compose.local.yml


1. Old / Existing Containers-ai Stop & Remove

	docker compose down --remove-orphans
	docker compose -f docker-compose.local.yml down --remove-orphans

	docker rm -f auromind_backend auromind_frontend auromind_postgres auromind_redis auromind_celery_worker auromind_celery_beat auromind_backend_prod auromind_frontend_prod 	auromind_postgres_prod auromind_redis_prod auromind_celery_worker_prod auromind_celery_beat_prod 2>$null

2. Local Setup-ai Build Panni Run Seiyya (Single Command):

	docker compose -f docker-compose.local.yml up -d --build

3. Status & Logs Check

	Running Containers - docker compose -f docker-compose.local.yml ps
	live logs - docker compose -f docker-compose.local.yml logs -f
	Particular service (e.g. backend / frontend) logs - docker compose -f docker-compose.local.yml logs -f backend
							    docker compose -f docker-compose.local.yml logs -f frontend
4. Stop
	docker compose -f docker-compose.local.yml down

5.Quick Restart

	docker compose -f docker-compose.local.yml restart

6.Full Clean Restart
	
	docker compose -f docker-compose.local.yml down ; docker compose -f docker-compose.local.yml up -d

7.Restart with Rebuild

	docker compose -f docker-compose.local.yml down ; docker compose -f docker-compose.local.yml up -d --build

8.Particular Service Restart

	Backend - docker compose -f docker-compose.local.yml restart backend
	Frontend - docker compose -f docker-compose.local.yml restart frontend
	Celery Worker - docker compose -f docker-compose.local.yml restart celery_worker
	Database (PostgreSQL) - docker compose -f docker-compose.local.yml restart db

Local Ports Mapping:
Frontend: http://localhost:3000
Backend API: http://localhost:8000 (Swagger Docs: http://localhost:8000/docs)
PostgreSQL (pgvector): localhost:5435
Redis: localhost:6379

