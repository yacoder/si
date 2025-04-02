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
# For some Windows installations, one might need `cd frontend` first:
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

### 5. Local DB docker command

**Requirements:**
- Docker

**Setup:**

```
docker run --name mysql-container -e MYSQL_ROOT_PASSWORD=rootpassword -e MYSQL_DATABASE=chgksi -e MYSQL_USER=chgk-si -e MYSQL_PASSWORD=chgkpassword -p 3306:3306 -d mysql:latest
```

Then add following env variable:
 "SI_DB_CONFIG": "mysql://chgk-si:chgkpassword@localhost/chgksi",

## App Diagram

[View Diagram](https://gitdiagram.com/vgramagin/si)

## DB Creation scripts
```
CREATE TABLE users (
    id VARCHAR(255) NOT NULL UNIQUE, -- Unique string for the user ID
    email VARCHAR(255) NOT NULL,    -- Email field
    name VARCHAR(255) NOT NULL,     -- Name field
    token VARCHAR(255) NOT NULL,    -- Token field
    ratingid INT DEFAULT 0,         -- Integer field for rating ID
    PRIMARY KEY (id),               -- Set `id` as the primary key    
    UNIQUE (token)                  -- Ensure token is unique
);

CREATE TABLE games (
    id VARCHAR(255) NOT NULL UNIQUE, -- Unique string for the user ID
    name VARCHAR(255) NOT NULL,     -- Name field
    host_user_id VARCHAR(255) NOT NULL,    -- host user id field
    tournament_id VARCHAR(255) NOT NULL,     -- tournament id field
    status VARCHAR(255) NOT NULL,    -- status field
    token VARCHAR(255) NOT NULL,    -- Token field
    data TEXT CHARACTER SET utf8mb4 NOT NULL,    -- JSON data
    PRIMARY KEY (id)               -- Set `id` as the primary key    
);

```
