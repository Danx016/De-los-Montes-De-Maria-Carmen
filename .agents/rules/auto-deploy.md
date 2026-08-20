# Regla de Despliegue Automático (Oracle Cloud & GitHub)

Cada vez que se realice cualquier modificación, corrección o nueva funcionalidad en este proyecto:
1. **Compilar cliente**: Ejecutar `npm run build:client` para verificar que no haya errores de compilación.
2. **GitHub (`main`)**: Agregar todos los cambios (`git add -A`), hacer commit descriptivo y hacer `git push origin main`.
3. **Servidor Oracle Cloud (`157.137.233.119`)**: Conectar por SSH con la llave `C:\Users\danil\Downloads\ssh-key-2026-08-20.key` y actualizar en vivo:
   `ssh -i "C:\Users\danil\Downloads\ssh-key-2026-08-20.key" -o StrictHostKeyChecking=no ubuntu@157.137.233.119 "cd /home/ubuntu/montesdemaria && git pull origin main && npm install --production=false && npm run build && pm2 restart montesdemaria"`
4. Verificar que el servidor devuelva HTTP 200 y confirmar al usuario.
