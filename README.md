# 차필(chapil)
광고 없는 오픈소스 차계부 모바일 앱입니다.
한국에서 널리 쓰이는 상용 앱(마OO)을 대체하기 위해 만들게 되었습니다.

## 기술 스택
- Backend: FastAPI (Python)
- Database: SQLite
- Template: Jinja2
- Infra: Docker, Docker Compose, Tailscale VPN
- License: LGPL

## 디렉토리 구조
```
chapil/
├── app/
│   ├── main.py        # FastAPI 앱
│   ├── database.py    # DB 초기화
│   └── migrate.py     # ODS 마이그레이션
├── templates/         # Jinja2 HTML 템플릿
├── data/              # SQLite DB 저장 위치 (자동 생성)
├── Dockerfile
└── docker-compose.yml
```

## NAS와 Docker를 활용한 배포
저는 이 앱을 집에 있는 NAS에 설치된 Docker를 통해 배포하여 사용하고 있습니다. 사용자가 직접 설치하여 사용할 것을 염두에 둔 것으로, 아직 로그인 기능을 구현하지 않았습니다. 장기적으로는 지원할 계획을 갖고 있습니다. 지금은 각자 사용하시는 NAS를 비롯한 홈서버, 웹호스팅(AWS 등) 등으로 직접 구동하셔야 합니다.

### 1. 파일 업로드
File Station에서 적당한 위치에 `chapil` 폴더 통째로 업로드.  
예: `/volume1/docker/chapil`

### 2. 마이그레이션 (기존 마이클 앱 데이터)
SSH로 NAS 접속 후:

```bash
cd /volume1/docker/chapil
docker build -t chapil .
docker run --rm -v $(pwd)/data:/data -v /path/to/차계부_리포트.ods:/tmp/chapil.ods \
  chapil python migrate.py /tmp/chapil.ods
```

### 3. 서비스 시작
```bash
cd /volume1/docker/chapil
docker compose up -d
```

### 4. 접속
모바일 앱 특성상 어디서든 접속해야 사용이 가능하므로, 안전을 위해 공유기 포트포워딩은 하지 마시고 VPN을 이용하실 것을 권장드립니다.
저는 Tailscale을 활용하였습니다.

Tailscale IP로 접속:  
`http://100.x.x.x:8000`

스마트폰 브라우저에서 접속 후 '홈 화면에 추가' 하면 앱처럼 사용 가능.

## 업데이트
코드 수정 후:
```bash
docker compose down
docker compose up -d --build
```

## 데이터 백업
`data/`하위에 있는 .db 파일 하나만 보관해 주십시오.

# 업데이트 기록
### v26.3.30a
- 이미 등록한 주유 기록을 수정할 때 주유단가, 주유비, 주유량 셋 중 하나라도 값이 바뀌면 나머지 두 값을 자동으로 다시 계산합니다.
- 주유 기록을 새로 등록할 때 주유단가, 주유비, 주유량 셋 중 두 가지만 기록하고 나머지 한 곳을 빈칸으로 남기면 이를 자동으로 계산해 줍니다. 예를 들어, 주유단가와 주유비만 입력하면 이에 기반하여 주유량을 알아서 계산해 줍니다.
- 이미 등록한 주유 기록을 도중에 수정했을 때 연비 계산을 다시 하지 않는 문제를 바로잡았습니다.
- 주유, 정비, 기타 기록을 수정하려 할 때, 기존에 메모 칸을 비워뒀을 경우 'None'이라는 내용이 채워지는 버그가 있었습니다. 이를 해결하였습니다.
### v26.3.24a
- 최초 버전

## 알려진 버그
- 하단 탭이 아이폰 하단 내비게이션 바와 이격되지 않아 조작이 매끄럽지 않습니다. 근시일 내에 수정 예정입니다.