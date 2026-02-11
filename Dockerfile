# 1. 파이썬 3.11 버전의 가벼운 리눅스를 엔진으로 사용합니다.
FROM python:3.11-slim

# 2. 에러의 원인이었던 sqlite3 라이브러리와 설치 도구들을 강제로 설치합니다.
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    libsqlite3-dev \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# 3. 작업 공간을 설정하고 파일을 복사합니다.
WORKDIR /app
COPY . .

# 4. 필요한 파이썬 패키지들을 설치합니다.
RUN pip install --no-cache-dir -r requirements.txt

# 5. 서버를 실행합니다. (포트는 Railway가 정해주는 값을 사용합니다.)
CMD ["python", "main.py"]
