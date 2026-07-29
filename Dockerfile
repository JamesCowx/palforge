FROM python:3.11-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    lib32gcc-s1 lib32stdc++6 curl ca-certificates \
    && rm -rf /var/lib/apt/lists/*

RUN useradd -m -s /bin/bash steam

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN mkdir -p /app/servers /app/steamcmd /app/data \
    && chown -R steam:steam /app

ENV HOST=0.0.0.0
ENV PORT=8080
ENV SERVER_DATA_DIR=/app/servers
ENV STEAMCMD_DIR=/app/steamcmd
ENV DATA_DIR=/app/data

USER steam

EXPOSE 8080 8211/udp

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8080/health')" || exit 1

CMD ["python", "run.py"]
