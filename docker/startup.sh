#!/bin/bash

cd /app
pip install -r src/app/requirements.txt
npm --prefix src/client install
npm --prefix src/client run build
python -m src.app.app
