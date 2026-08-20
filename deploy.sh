#!/bin/bash
set -e
cd /home/ubuntu/montesdemaria
echo "[1/4] Descargando ultimos cambios de GitHub..."
git fetch origin main
git reset --hard origin/main

echo "[2/4] Instalando dependencias..."
npm install --production=false

echo "[3/4] Compilando frontend..."
npm run build

echo "[4/4] Reiniciando aplicacion con PM2..."
pm2 restart montesdemaria

echo "=== DESPLIEGUE COMPLETADO CON EXITO ==="
