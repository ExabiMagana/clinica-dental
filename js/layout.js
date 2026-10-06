const Layout = {

    // Definición del menú lateral. Centralizada aquí.
    // Si más adelante se agrega un módulo, solo se edita este array.
    _menu: [
        { seccion: "dashboard",    href: "dashboard.html",    icono: "bi-speedometer2",        texto: "Dashboard"    },
        { seccion: "pacientes",    href: "pacientes.html",    icono: "bi-people",              texto: "Pacientes"    },
        { seccion: "agenda",       href: "agenda.html",       icono: "bi-calendar-week",       texto: "Agenda"       },
        { seccion: "consultas",    href: "consultas.html",    icono: "bi-clipboard2-check",    texto: "Consultas"    },
        { seccion: "tratamientos", href: "tratamientos.html", icono: "bi-bandaid",             texto: "Tratamientos" },
        { seccion: "reportes",     href: "reportes.html",     icono: "bi-bar-chart",           texto: "Reportes"     },
        { seccion: "usuarios",     href: "usuarios.html",     icono: "bi-person-badge",        texto: "Usuarios"     },
        { seccion: "configuracion",href: "configuracion.html",icono: "bi-gear",                texto: "Configuración"}
    ],

    /**
     * Renderiza el layout completo dentro de #app-layout.
     * @param {Object} opciones
     * @param {string} opciones.seccion   - Clave de la sección activa (ej. "pacientes")
     * @param {string} opciones.titulo    - Título a mostrar en la topbar
     */
    render({ seccion, titulo }) {
        const contenedor = document.getElementById("app-layout");
        if (!contenedor) {
            console.error('Layout: no existe el elemento #app-layout en el HTML.');
            return;
        }

        // Verificar sesión antes de dibujar nada
        Auth.requerirSesion();

        const usuario = Api.getUsuario() || { nombreCompleto: "—", rol: "—" };

        // Contenido del <main> ya está en el HTML, lo movemos al nuevo layout
        const contenidoOriginal = document.getElementById("app-contenido");
        const contenidoHTML = contenidoOriginal ? contenidoOriginal.innerHTML : "";
        if (contenidoOriginal) contenidoOriginal.remove();

        // Construir el menú lateral
        const menuHTML = this._menu.map(item => {
            const activo = item.seccion === seccion ? "active" : "";
            return `<li><a href="${item.href}" class="${activo}">
                        <i class="bi ${item.icono}"></i> ${item.texto}
                    </a></li>`;
        }).join("");

        // Layout completo
        contenedor.innerHTML = `
            <div class="layout">

                <aside class="sidebar">
                    <div class="sidebar-brand">
                        <i class="bi bi-clipboard2-pulse"></i>
                        <span>Clínica Dental</span>
                    </div>
                    <ul class="sidebar-menu">
                        ${menuHTML}
                    </ul>
                    <div class="sidebar-footer">
                        <span class="badge bg-primary" id="layoutRol">${this._esc(usuario.rol)}</span>
                    </div>
                </aside>

                <div class="main">
                    <header class="topbar">
                        <h1>${this._esc(titulo || "")}</h1>
                        <div class="topbar-user">
                            <i class="bi bi-person-circle fs-4 text-secondary"></i>
                            <span>${this._esc(usuario.nombreCompleto)}</span>
                            <button class="btn btn-sm btn-outline-danger" id="layoutBtnLogout"
                                    title="Cerrar sesión">
                                <i class="bi bi-box-arrow-right"></i>
                            </button>
                        </div>
                    </header>

                    <main class="content" id="layoutContenido">
                        ${contenidoHTML}
                    </main>
                </div>
            </div>
        `;

        // Conectar logout
        document.getElementById("layoutBtnLogout").addEventListener("click", () => {
            if (confirm("¿Cerrar sesión?")) Auth.logout();
        });

        // Si la página quiere ejecutarse después de montar el layout
        if (typeof window.onLayoutReady === "function") {
            window.onLayoutReady();
        }
    },

    _esc(texto) {
        if (texto === null || texto === undefined) return "";
        const div = document.createElement("div");
        div.textContent = String(texto);
        return div.innerHTML;
    }
};

window.Layout = Layout;