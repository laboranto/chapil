# ── Stage 1: React 프론트엔드 빌드 ──────────────────────────────────
# node:20-slim 이미지에서 npm run build를 실행한다.
# "multi-stage build"를 사용하면 최종 이미지에 Node.js가 포함되지 않아 용량이 줄어든다.
FROM node:20-slim AS frontend-build

WORKDIR /frontend

# package.json과 package-lock.json을 먼저 복사한다.
# 소스 코드보다 의존성이 바뀌는 빈도가 낮으므로, 이 레이어는 대부분 캐시된다.
COPY frontend/package*.json ./
RUN npm ci

# 나머지 소스 복사 후 프로덕션 빌드 실행
COPY frontend/ ./
RUN npm run build
# 결과물은 /frontend/dist/ 에 생성된다.


# ── Stage 2: Python 백엔드 ───────────────────────────────────────────
FROM python:3.12-slim

WORKDIR /app

RUN pip install --no-cache-dir fastapi uvicorn

# 백엔드 소스
COPY app/ /app/

# 정적 파일 (아이콘, manifest 등) — 환경변수로 경로를 알려준다
ENV STATIC_DIR=/frontend/public
# COPY static/ /app/static/

# Stage 1의 빌드 결과물만 복사 (Node.js 자체는 포함되지 않음)
COPY --from=frontend-build /frontend/dist/ /app/frontend/dist/

RUN mkdir -p /data

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
