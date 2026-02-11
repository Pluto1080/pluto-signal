FROM python:3.11-slim

# 시스템 라이브러리(sqlite3, gcc)를 OS 환경에 직접 설치
RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY . .

# 파이썬 라이브러리를 현재 환경에 설치하여 경로 불일치 방지
RUN pip install --no-cache-dir -r requirements.txt

ENV PORT=8080
EXPOSE 8080

CMD ["python", "main.py"]
