#!/bin/bash

cd /app
pip install -r backend/app/requirements.txt
python -m backend.app.app
