# 차계부

마이클 앱 대체용 셀프호스팅 차계부. FastAPI + SQLite + Docker.

## 디렉토리 구조

```
carlog/
├── app/
│   ├── main.py        # FastAPI 앱
│   ├── database.py    # DB 초기화
│   └── migrate.py     # ODS 마이그레이션
├── templates/         # Jinja2 HTML 템플릿
├── data/              # SQLite DB 저장 위치 (자동 생성)
├── Dockerfile
└── docker-compose.yml
```

## Synology 배포

### 1. 파일 업로드
File Station에서 적당한 위치에 `carlog` 폴더 통째로 업로드.  
예: `/volume1/docker/carlog`

### 2. 마이그레이션 (기존 마이클 앱 데이터)
SSH로 NAS 접속 후:

```bash
cd /volume1/docker/carlog
docker build -t carlog .
docker run --rm -v $(pwd)/data:/data -v /path/to/차계부_리포트.ods:/tmp/carlog.ods \
  carlog python migrate.py /tmp/carlog.ods
```

### 3. 서비스 시작

```bash
cd /volume1/docker/carlog
docker compose up -d
```

### 4. 접속
Tailscale IP로 접속:  
`http://100.x.x.x:8000`

스마트폰 브라우저에서 접속 후 "홈 화면에 추가" 하면 앱처럼 사용 가능.

## 업데이트

코드 수정 후:
```bash
docker compose down
docker compose up -d --build
```

## 데이터 백업

`data/carlog.db` 파일 하나만 복사하면 됨.
