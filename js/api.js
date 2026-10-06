const Api = {

    // Sesión (guardar/leer/borrar)
    getToken() {
        return localStorage.getItem(APP_CONFIG.TOKEN_KEY);
    },

    getUsuario() {
        const raw = localStorage.getItem(APP_CONFIG.USER_KEY);
        if (!raw) return null;
        try { return JSON.parse(raw); } catch { return null; }
    },

    guardarSesion(token, usuario) {
        localStorage.setItem(APP_CONFIG.TOKEN_KEY, token);
        localStorage.setItem(APP_CONFIG.USER_KEY, JSON.stringify(usuario));
    },

    limpiarSesion() {
        localStorage.removeItem(APP_CONFIG.TOKEN_KEY);
        localStorage.removeItem(APP_CONFIG.USER_KEY);
    },

    // Petición genérica
    async request(ruta, opciones = {}) {
        const url = APP_CONFIG.API_URL + ruta;

        const headers = {
            "Accept": "application/json",
            ...(opciones.headers || {})
        };

        let body;
        if (opciones.body !== undefined) {
            headers["Content-Type"] = "application/json";
            body = typeof opciones.body === "string"
                ? opciones.body
                : JSON.stringify(opciones.body);
        }

        const token = this.getToken();
        if (token) {
            headers["Authorization"] = "Bearer " + token;
        }

        let response;
        try {
            response = await fetch(url, {
                method: opciones.method || "GET",
                headers,
                body
            });
        } catch (err) {
            const error = new Error("No se pudo conectar con el servidor.");
            error.status = 0;
            throw error;
        }

        if (response.status === 401) {
            const teniaToken = !!this.getToken();
            this.limpiarSesion();

            if (!window.location.pathname.endsWith("/login.html")) {
                const enPages = window.location.pathname.includes("/pages/");
                const destino = enPages ? "../login.html?expirado=1" : "login.html?expirado=1";
                window.location.href = destino;
            }

            const error = new Error(teniaToken
                ? "Tu sesión expiró. Vuelve a iniciar sesión."
                : "No autorizado.");
            error.status = 401;
            throw error;
        }

        let data = null;
        const ct = response.headers.get("content-type") || "";
        if (ct.includes("application/json")) {
            data = await response.json().catch(() => null);
        }

        if (!response.ok) {
            const mensaje =
                (data && (data.mensaje || data.title || data.detail)) ||
                `Error ${response.status}`;
            const error = new Error(mensaje);
            error.status = response.status;
            error.data = data;
            throw error;
        }

        return data;
    },

    // Atajos
    get(ruta, opciones = {})    { return this.request(ruta, { ...opciones, method: "GET"    }); },
    post(ruta, body, op = {})   { return this.request(ruta, { ...op, method: "POST",   body }); },
    put(ruta, body, op = {})    { return this.request(ruta, { ...op, method: "PUT",    body }); },
    patch(ruta, body, op = {})  { return this.request(ruta, { ...op, method: "PATCH",  body }); },
    delete(ruta, op = {})       { return this.request(ruta, { ...op, method: "DELETE" }); }
};

window.Api = Api;