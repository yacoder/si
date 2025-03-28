#!/bin/bash

cd /app
pip install -r backend/app/requirements.txt
npm --prefix frontend install
npm --prefix frontend run watch
