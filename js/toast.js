const Toast = {
    _contenedor: null,

    _obtenerContenedor() {
        if (this._contenedor) return this._contenedor;
        let c = document.getElementById("toast-container");
        if (!c) {
            c = document.createElement("div");
            c.id = "toast-container";
            c.className = "toast-container position-fixed top-0 end-0 p-3";
            c.style.zIndex = "1100";
            document.body.appendChild(c);
        }
        this._contenedor = c;
        return c;
    },

    _mostrar(mensaje, tipo) {
        const estilos = {
            exito: { color: "text-bg-success", icono: "bi-check-circle" },
            error: { color: "text-bg-danger",  icono: "bi-x-circle" },
            info:  { color: "text-bg-primary", icono: "bi-info-circle" },
            aviso: { color: "text-bg-warning", icono: "bi-exclamation-triangle" }
        };
        const estilo = estilos[tipo] || estilos.info;

        const contenedor = this._obtenerContenedor();
        const div = document.createElement("div");
        div.className = `toast align-items-center ${estilo.color} border-0`;
        div.setAttribute("role", "alert");
        div.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${estilo.icono} me-2"></i>
                    ${this._esc(mensaje)}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto"
                        data-bs-dismiss="toast"></button>
            </div>
        `;
        contenedor.appendChild(div);

        const toast = new bootstrap.Toast(div, { delay: 3500 });
        toast.show();
        div.addEventListener("hidden.bs.toast", () => div.remove());
    },

    exito(mensaje) { this._mostrar(mensaje, "exito"); },
    error(mensaje) { this._mostrar(mensaje, "error"); },
    info(mensaje)  { this._mostrar(mensaje, "info");  },
    aviso(mensaje) { this._mostrar(mensaje, "aviso"); },

    _esc(texto) {
        const div = document.createElement("div");
        div.textContent = texto ?? "";
        return div.innerHTML;
    }
};

window.Toast = Toast;