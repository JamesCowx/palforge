FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    lib32gcc-s1 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/servers /app/steamcmd

ENV HOST=0.0.0.0
ENV PORT=8080
ENV SERVER_DATA_DIR=/app/servers
ENV STEAMCMD_DIR=/app/steamcmd

EXPOSE 8080 8211/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["python", "run.py"]
