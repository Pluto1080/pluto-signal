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

# Railway에서는 Gunicorn 사용이 권장됩니다. 
# CMD ["gunicorn", "--bind", "0.0.0.0:8080", "main:app"] 로 변경하면 더 안정적입니다.
CMD ["python", "main.py"]
