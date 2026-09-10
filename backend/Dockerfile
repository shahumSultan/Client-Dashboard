FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies. Dev extras (pytest) are opt-in so a production
# image stays lean; docker-compose turns them on.
ARG INSTALL_DEV=false
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
    && if [ "$INSTALL_DEV" = "true" ]; then \
         pip install --no-cache-dir -r requirements-dev.txt; \
       fi

# Copy app source
COPY . .

# Run migrations then start the server
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
