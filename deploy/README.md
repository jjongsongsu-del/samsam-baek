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

To serve the API through HTTPS on a custom public port such as 8091, set
`deploy/.env` like this:

```env
HTTP_PORT=80
HTTPS_PORT=8091
CADDY_HTTPS_PORT=8091
CADDY_SITE_ADDRESS=samsam.aodata.co.kr:8091
```

Then the API will be available at `https://samsam.aodata.co.kr:8091`.

Keep port 80 open for Caddy/Let's Encrypt certificate issuance. The application
traffic can still use port 8091. If port 80 cannot be opened on the public
network, use DNS-based certificate issuance or provide a manually issued
certificate to Caddy.

## Seed data

The BFF image includes default seed files under `/app/seed-data`.
On first container start, `docker-entrypoint.sh` copies them into `/app/data`
only when the target files do not already exist. This lets a fresh Docker
volume start with the bundled map data while preserving CSV data uploaded later
through the admin UI.
