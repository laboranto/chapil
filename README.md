# 차필(chapil)
광고 없는 오픈소스 차계부 모바일 앱입니다.
한국에서 널리 쓰이는 상용 앱(마OO)을 대체하기 위해 만들게 되었습니다.

## 기술 스택
- Backend: FastAPI (Python) Rest API
- Database: SQLite
- Frontend: React
- Infra: Docker, Docker Compose, Tailscale VPN
- License: LGPL

## 디렉토리 구조
```
chapil/
├── app/                              # Python 백엔드
├── frontend/                      # React 프론트엔드
├── data/carlog.db              # SQLite DB (자동 생성)
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
테스트 된 VPN 환경은 Tailscale입니다.

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
### v26.4.3a
- [백엔드] jinja2 템플릿 기반 MPA에서 FastAPI REST API로 전환하였습니다.
- [프론트엔드]html/css/js에서 React 기반으로 대체되었습니다.
- [최적화] react-router-dom을 활용하여 SPA(Single Page Application) 방식으로 구동하도록 개선하였습니다.
### v26.4.2a
- UI를 개편하였습니다.
- 홈 탭의 맨 위에 '🚗차계부' 문구를 '요약'으로 대체하였습니다.
- 입력 항목에서 저장 및 취소 버튼을 상단에 항상 고정되도록 변경하였습니다.
- 그 밖에 시각 효과가 추가되었습니다.
### v26.4.1a
- 아이콘을 추가하였습니다.
- iOS 외에 안드로이드에서 웹앱 형식으로 사용이 되지 않던 문제를 해결하였습니다.
### v26.3.30a
- UI를 일부 개선하였습니다.
- 이미 등록한 주유 기록을 수정할 때 주유단가, 주유비, 주유량 셋 중 하나라도 값이 바뀌면 나머지 두 값을 자동으로 다시 계산합니다.
- 주유 기록을 새로 등록할 때 주유단가, 주유비, 주유량 셋 중 두 가지만 기록하고 나머지 한 곳을 빈칸으로 남기면 이를 자동으로 계산해 줍니다. 예를 들어, 주유단가와 주유비만 입력하면 이에 기반하여 주유량을 알아서 계산해 줍니다.
- 이미 등록한 주유 기록을 도중에 수정했을 때 연비 계산을 다시 하지 않는 문제를 바로잡았습니다.
- 주유, 정비, 기타 기록을 수정하려 할 때, 기존에 메모 칸을 비워뒀을 경우 'None'이라는 내용이 채워지는 버그가 있었습니다. 이를 해결하였습니다.
### v26.3.24a
- 최초 버전

# 장기적인 계획
- 웹앱 대신 네이티브앱으로 사용 가능하도록 jinja2가 아닌 react 기반으로 전환하고 앱스토어 및 Play스토어, F-droid를 통한 런칭을 목표로 합니다.
- '설정' 탭을 구현하여 데이터 가져오기 및 내보내기, 차량 프로필 등록(차종, 차량번호 등)을 관리합니다.
- 차량 관리 기록을 보기 편하게 다듬고 검색 기능을 구현할 예정입니다.

# 스크린샷
### v26.4.2a
![4개의 스크린샷이 가로로 정렬되어 있다. 왼쪽부터 차례로 요약, 주유 기록, 주유 기록 양식, 주유 기록 리스트를 중간쯤 스크롤 했을 때의 화면이다. 하단의 탭 바가 반투명하게 떠있으며 스크롤을 하면 위아래로 뿌옇게 사라지는 효과가 나타난다.](screenshot_v260402a.webp)

### v26.4.1a
<img src="screenshot_icon.png" alt="차필 아이콘" width="200">

### v26.3.30a
<img src="screenshot_v260330a.jpg" alt="26.03.30 알파버전 실행 화면. 주유 탭에 활성화 되어 있고, 목록에는 주유 기록이 나열되어 있다. 연비가 표시되어 있으며, 수정 버튼과 삭제 버튼도 각 기록마다 존재한다." width="200">