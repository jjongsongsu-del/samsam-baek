#!/usr/bin/env bash
set -euo pipefail

echo "[1/5] Updating Oracle Linux packages"
sudo dnf update -y

echo "[2/5] Installing base tools"
sudo dnf install -y git curl ca-certificates dnf-plugins-core unzip firewalld

echo "[3/5] Installing Docker Engine and Compose plugin"
sudo dnf config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "[4/5] Enabling services"
sudo systemctl enable --now docker
sudo systemctl enable --now firewalld

echo "[5/5] Opening HTTP/HTTPS firewall ports"
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload

sudo usermod -aG docker "${USER}"

echo
echo "Docker installation is complete."
echo "Log out and SSH back in so the docker group permission is applied."
