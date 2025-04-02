# si
opensource SI system

# notes

Так как на сервере нет ни докера ни нода, то на сервер идет дистрибутив.
Дистрибутив делается в Git и деплоится автоматически скиптом на сервер.

# dev instructions

Мы поддерживаем следующие конфигурации:
### 1) 100% локальная разработка:
- нужно: Python, node
- git pull
- pip install -r backend/app/requirements.txt
- npm --prefix frontend install 
   - doesn't work on windows?
     - cd frontend; npm install; npm run watch
- 2 терминала:
  1. npm --prefix frontend run watch
  2. python -m backend.app.app --env debug

### 2) локальная разработка для докера
- нужно: Докер
- git pull
- rename docker-compose.debug.yml -> docker-compose.yml 
- docker-compose up
- docker-exec -it si-dev-app-1 bash
- python -m backend.app.app --env debug (внутри container)

### 3) локальный запуск (очень похоже на сервер)
- нужно: Python
- скачиваем и достаем все из дистрибутива: https://github.com/vgramagin/si/actions/runs/14164565400/artifacts/2848738289 ( это сегодняшняя версия, есть скрипт который ее находит)
- pip install -r backend/app/requirements.txt
- python -m backend.app.app

### 4) локальный запуск docker
- нужно: Докер
- git pull
- rename docker-compose.build.yml -> docker-compose.yml 
- docker-compose up