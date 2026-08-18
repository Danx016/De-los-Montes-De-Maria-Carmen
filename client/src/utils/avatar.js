/**
 * Utilidad para resolver avatares de usuario con iniciales estilizadas cuando no hay foto personalizada
 */
export function getAvatarUrl(user, nameFallback = null) {
  const avatar = typeof user === 'string' ? user : (user?.avatar || user?.foto_perfil || user?.vendedor_avatar);
  
  if (avatar && typeof avatar === 'string' && avatar.trim() !== '') {
    const isBrandLogo = avatar.includes('Logo.jpg') || avatar.includes('logo%20vaca') || avatar.includes('logo vaca');
    if (!isBrandLogo) {
      if (avatar.startsWith('http') || avatar.startsWith('/')) {
        return avatar;
      }
      return `/uploads/profiles/${avatar}`;
    }
  }

  const name = nameFallback || (typeof user === 'object' && user ? (user.nombre || user.username || user.apodo || 'Usuario') : 'Usuario');
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=15803d&color=ffffff&bold=true&size=256`;
}

export function handleAvatarError(e, name = 'Usuario') {
  e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=15803d&color=ffffff&bold=true&size=256`;
}
