const Auth = {

    // ¿Hay sesión activa?
    estaLogueado() {
        return !!Api.getToken();
    },

    // Redirige al login si no hay sesión.
    requerirSesion() {
        if (!this.estaLogueado()) {
            const enPages = window.location.pathname.includes("/pages/");
            window.location.href = enPages ? "../login.html" : "login.html";
        }
    },

    // Si ya hay sesión y estamos en login, redirige al dashboard.
    redirigirSiLogueado() {
        if (this.estaLogueado()) {
            const enPages = window.location.pathname.includes("/pages/");
            window.location.href = enPages ? "dashboard.html" : "pages/dashboard.html";
        }
    },

    // Llama a la API, guarda la sesión y devuelve los datos del login.
    async login(nombreUsuario, password) {
        const data = await Api.post("/auth/login", { nombreUsuario, password });
        Api.guardarSesion(data.token, data.usuario);
        return data;
    },

    // Cierra sesión y va al login.
    logout() {
        Api.limpiarSesion();
        const enPages = window.location.pathname.includes("/pages/");
        window.location.href = enPages ? "../login.html" : "login.html";
    }
};

window.Auth = Auth;