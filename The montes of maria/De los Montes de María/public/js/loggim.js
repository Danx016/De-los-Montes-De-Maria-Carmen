document.addEventListener('DOMContentLoaded', () => {
    const toggleIcon = document.getElementById('toggle-password-btn');
    if (toggleIcon) {
        toggleIcon.addEventListener('click', function() {
            const passwordInput = document.getElementById('password');
            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.textContent = '🙈';
            } else {
                passwordInput.type = 'password';
                this.textContent = '👁️';
            }
        });
    }
});

document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('apodo').value;
    const password = document.getElementById('password').value;
    const remember = document.querySelector('input[name="remember"]')?.checked || false;

    if(username.trim() === '' || password.trim() === '') {
        alert('Por favor, completa todos los campos');
        return;
    }

    const loader = document.getElementById("global-loader");
    const loaderIcon = document.getElementById("loader-icon");
    const loaderText = document.getElementById("loader-text");

    if (loader) {
        loader.style.display = "flex";
        if (loaderIcon) {
            loaderIcon.className = "fa fa-spinner fa-spin fa-3x";
            loaderIcon.style.color = "#3ba75a";
        }
        if (loaderText) {
            loaderText.textContent = "Iniciando sesión...";
            loaderText.style.color = "";
        }
    }

    try {
        const csrfInput = document.getElementById('csrfToken') || document.querySelector('input[name="_csrf"]');
        const csrfToken = csrfInput ? csrfInput.value : '';

        const response = await fetch('/login', {
            method: 'POST',
            credentials: 'include',
            headers: { 
                'Content-Type': 'application/json',
                'x-csrf-token': csrfToken
            },
            body: JSON.stringify({ username, password })
        });
        const data = await response.json();

        if (response.ok && data.idUser) {
            const rolNum = Number(data.rolUser);
            const isAdmin = (rolNum === 1 || data.username === 'admin');
            const isVendedor = (rolNum === 2);
            const isSoporte = (rolNum === 4);

            // Guarda el token JWT y datos del usuario
            const user = {
                idUser: data.idUser,
                nombreUser: data.nombreUser,
                emailUser: data.emailUser,
                username: data.username,
                rolUser: rolNum,
                avatar: data.avatar || '../img/logo vaca.png',
                token: data.token
            };
            localStorage.setItem('user', JSON.stringify(user));

            if (loaderIcon) {
                loaderIcon.className = "fa-solid fa-circle-check fa-3x";
                loaderIcon.style.color = "#10b981";
            }
            if (loaderText) {
                loaderText.textContent = "¡Sesión iniciada con éxito! Bienvenido.";
                loaderText.style.color = "#10b981";
            }

            // Esperar 1.2 segundos y redirigir al panel correspondiente según el rol
            setTimeout(() => {
                if (loader) loader.style.display = "none";
                if (isAdmin) {
                    window.location.href = '/admin';
                } else if (isVendedor) {
                    window.location.href = '/vendedor';
                } else if (isSoporte) {
                    window.location.href = '/admin/soporte';
                } else {
                    window.location.href = '/';
                }
            }, 1200);
        } else {
            if (loaderIcon) {
                loaderIcon.className = "fa-solid fa-circle-xmark fa-3x";
                loaderIcon.style.color = "#ef4444";
            }
            if (loaderText) {
                loaderText.textContent = data.message || "Usuario o contraseña incorrectos.";
                loaderText.style.color = "#ef4444";
            }
            setTimeout(() => {
                if (loader) loader.style.display = "none";
            }, 2500);
        }
    } catch (error) {
        if (loaderIcon) {
            loaderIcon.className = "fa-solid fa-circle-xmark fa-3x";
            loaderIcon.style.color = "#ef4444";
        }
        if (loaderText) {
            loaderText.textContent = "Error de red al intentar iniciar sesión.";
            loaderText.style.color = "#ef4444";
        }
        setTimeout(() => {
            if (loader) loader.style.display = "none";
        }, 2500);
    }
});