# Development Setup Guide

![Project Logo](assets/images/logo.jpg)

This document outlines different methods for setting up and running the application, depending on your environment preferences.


## CI/CD Status

[![Build Status](https://github.com/vgramagin/si/actions/workflows/main.yml/badge.svg)](https://github.com/vgramagin/si/actions/workflows/main.yml)


## Configuration Options

### 1. Full Local Development

**Requirements:**

- Python
- Node.js

**Setup:**
```bash

# Clone the repository
git pull

# Install backend dependencies
pip install -r backend/app/requirements.txt

# Install frontend dependencies
# For some Windows installations, one might need to run  to `cd frontend` first:
# cd frontend; npm install; npm run watch
npm --prefix frontend install


```

**Running the application:**
Open two terminal windows:
```bash

# Terminal 1 - Frontend with hot reload
npm --prefix frontend run watch

# Terminal 2 - Backend in debug mode
python -m backend.app.app --env debug
```

### 2. Docker-based Local Development

**Requirements:**

- Docker

**Setup:**

```bash
# Clone the repository
git pull

# Rename the development docker-compose file
mv docker-compose.debug.yml docker-compose.yml

# Start the containers
docker-compose up
```

**Accessing the application container:**

```bash
# Access the application container shell
docker exec -it si-dev-app-1 bash

# Run the backend in debug mode inside the container
python -m backend.app.app --env debug
```

### 3. Local Execution (Server-like Environment)
**Requirements:**
- Python

**Setup:**

```bash
# Download and extract the distribution package from:
# https://github.com/vgramagin/si/actions/runs/14164565400/artifacts/2848738289
# (Note: This is a specific version - a script is available to find the latest)

# Install dependencies
pip install -r backend/app/requirements.txt
```

**Running the application:**

```bash
# Run the backend
python -m backend.app.app
```

### 4. Local Docker Production-like Environment

**Requirements:**
- Docker

**Setup:**

```bash
# Clone the repository
git pull

# Rename the production docker-compose file
mv docker-compose.build.yml docker-compose.yml

# Start the containers
docker-compose up
```

## App Diagram

[View Diagram](https://gitdiagram.com/vgramagin/si)