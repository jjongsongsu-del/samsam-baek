# Samsam Baekgwa Production Deploy

This deployment uses English model paths to avoid Korean path encoding issues on servers.

Required model files:

- `model/04_ai_model_source/yolov5.zip`
- `model/05_trained_model_files/Age_Grade_best.pt`
- `model/05_trained_model_files/Object_best.pt`

Run from the repository root:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build
```

This compose stack keeps Samsam Baekgwa available on the existing service port
8091. If HTTPS is handled by an external reverse proxy, set `deploy/.env` like
this:

```env
HTTP_PORT=8091
CADDY_SITE_ADDRESS=:80
```

The external reverse proxy should forward public traffic from:

```text
https://samsam.aodata.co.kr
```

to the server's existing Samsam Baekgwa service on port 8091.

The public privacy policy page is served by the BFF at:

```text
https://samsam.aodata.co.kr/privacy
```

## Seed data

The BFF image includes default seed files under `/app/seed-data`.
On first container start, `docker-entrypoint.sh` copies them into `/app/data`
only when the target files do not already exist. This lets a fresh Docker
volume start with the bundled map data while preserving CSV data uploaded later
through the admin UI.
