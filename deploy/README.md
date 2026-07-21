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

If another service already uses ports 80 or 443 on the host, set the public
HTTP port in `deploy/.env`:

```env
HTTP_PORT=8091
CADDY_SITE_ADDRESS=:80
```

Then the API will be available at `http://<server-host>:8091`.
