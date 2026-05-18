# Samsam Baekgwa Production Deploy

This deployment uses English model paths to avoid Korean path encoding issues on servers.

Required model files:

- `model_en/yolov5/yolov5.zip`
- `model_en/weights/Age_Grade_best.pt`
- `model_en/weights/Object_best.pt`

Run from the repository root:

```bash
docker compose --env-file deploy/.env -f deploy/docker-compose.prod.yml up -d --build
```
