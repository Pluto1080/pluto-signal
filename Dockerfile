FROM python:3.11-slim

RUN apt-get update && apt-get install -y \
    libsqlite3-0 \
    gcc \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# [중요] 한 줄로 작성해야 합니다.
COPY . .

RUN pip install --no-cache-dir -r requirements.txt

ENV PORT=8080
EXPOSE 8080

CMD ["gunicorn", "--bind", "0.0.0.0:8080", "--timeout", "120", "--workers", "2", "main:app"]
