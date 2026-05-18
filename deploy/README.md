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
