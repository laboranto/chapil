import os
import tempfile

# main/database 모듈이 처음 import되기 전에 DB_PATH를 임시 파일로 돌려놓는다.
# database.py의 DB_PATH는 모듈 최상단에서 한 번만 계산되므로, conftest.py가
# 테스트 모듈보다 먼저 로드되는 pytest의 특성을 이용한다.
_tmp_dir = tempfile.mkdtemp(prefix="chapil-test-")
os.environ["DB_PATH"] = os.path.join(_tmp_dir, "test.db")
