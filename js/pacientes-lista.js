window.onLayoutReady = function () {
    const tabla = document.getElementById("tablaPacientes");
    const paginacion = document.getElementById("paginacion");
    const infoPaginacion = document.getElementById("infoPaginacion");
    const totalBadge = document.getElementById("totalPacientes");

    const estado = {
        pagina: 1,
        tamano: 10,
        filtros: { busqueda: "", activo: "true", sexo: "" }
    };

    // Cargar listado
    async function cargar() {
        tabla.innerHTML =
            `<tr><td colspan="8" class="text-center text-muted py-4">Cargando…</td></tr>`;

        const params = new URLSearchParams();
        params.set("pagina", estado.pagina);
        params.set("tamano", estado.tamano);
        if (estado.filtros.busqueda) params.set("busqueda", estado.filtros.busqueda);
        if (estado.filtros.activo !== "") params.set("activo", estado.filtros.activo);
        if (estado.filtros.sexo) params.set("sexo", estado.filtros.sexo);

        try {
            const data = await Api.get("/pacientes?" + params.toString());
            totalBadge.textContent = data.total;
            renderTabla(data.items);
            renderPaginacion(data);
        } catch (err) {
            if (err.status === 401) return;
            tabla.innerHTML = `<tr><td colspan="8" class="text-center text-danger py-4">
                Error al cargar: ${esc(err.message)}
            </td></tr>`;
            Toast.error("No se pudo cargar el listado.");
        }
    }

    function renderTabla(items) {
        if (!items || items.length === 0) {
            tabla.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">
                No hay pacientes que coincidan con los filtros.
            </td></tr>`;
            return;
        }

        tabla.innerHTML = items.map(p => `
            <tr>
                <td>${esc(p.documento) || `<span class="text-muted">—</span>`}</td>
                <td>${esc(p.nombres)}</td>
                <td>${esc(p.apellidos)}</td>
                <td>${p.edad}</td>
                <td>${etiquetaSexo(p.sexo)}</td>
                <td>${esc(p.telefono) || `<span class="text-muted">—</span>`}</td>
                <td>${p.activo
                    ? '<span class="badge bg-success">Activo</span>'
                    : '<span class="badge bg-secondary">Inactivo</span>'}</td>
                <td class="text-end">
                    <button class="btn btn-sm btn-outline-secondary" data-accion="expediente"
                            data-id="${p.id}" title="Expediente">
                        <i class="bi bi-folder2-open"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary" data-accion="editar"
                            data-id="${p.id}" title="Editar">
                        <i class="bi bi-pencil"></i>
                    </button>
                    ${p.activo
                        ? `<button class="btn btn-sm btn-outline-danger" data-accion="desactivar"
                                   data-id="${p.id}" title="Desactivar">
                              <i class="bi bi-slash-circle"></i>
                           </button>`
                        : `<button class="btn btn-sm btn-outline-success" data-accion="reactivar"
                                   data-id="${p.id}" title="Reactivar">
                              <i class="bi bi-arrow-counterclockwise"></i>
                           </button>`}
                </td>
            </tr>
        `).join("");

        tabla.querySelectorAll("button[data-accion]").forEach(btn => {
            btn.addEventListener("click", () => manejarAccion(btn.dataset.accion, parseInt(btn.dataset.id)));
        });
    }

    function renderPaginacion(data) {
        paginacion.innerHTML = "";

        if (data.total === 0) {
            infoPaginacion.textContent = "Sin resultados";
            return;
        }

        const inicio = (data.pagina - 1) * data.tamano + 1;
        const fin = Math.min(data.pagina * data.tamano, data.total);
        infoPaginacion.textContent = `Mostrando ${inicio}–${fin} de ${data.total}`;

        if (data.totalPaginas <= 1) return;

        const crearBoton = (texto, pagina, deshabilitado = false, activo = false) => {
            const li = document.createElement("li");
            li.className = "page-item" +
                (deshabilitado ? " disabled" : "") +
                (activo ? " active" : "");
            const a = document.createElement("a");
            a.className = "page-link";
            a.href = "#";
            a.textContent = texto;
            a.addEventListener("click", (e) => {
                e.preventDefault();
                if (deshabilitado || activo) return;
                estado.pagina = pagina;
                cargar();
            });
            li.appendChild(a);
            paginacion.appendChild(li);
        };

        crearBoton("«", data.pagina - 1, data.pagina === 1);

        const rango = 2;
        const desde = Math.max(1, data.pagina - rango);
        const hasta = Math.min(data.totalPaginas, data.pagina + rango);

        if (desde > 1) {
            crearBoton("1", 1, false, data.pagina === 1);
            if (desde > 2) {
                const li = document.createElement("li");
                li.className = "page-item disabled";
                li.innerHTML = `<span class="page-link">…</span>`;
                paginacion.appendChild(li);
            }
        }

        for (let i = desde; i <= hasta; i++) {
            crearBoton(i.toString(), i, false, i === data.pagina);
        }

        if (hasta < data.totalPaginas) {
            if (hasta < data.totalPaginas - 1) {
                const li = document.createElement("li");
                li.className = "page-item disabled";
                li.innerHTML = `<span class="page-link">…</span>`;
                paginacion.appendChild(li);
            }
            crearBoton(
                data.totalPaginas.toString(),
                data.totalPaginas,
                false,
                data.pagina === data.totalPaginas
            );
        }

        crearBoton("»", data.pagina + 1, data.pagina === data.totalPaginas);
    }

    // Acciones
    async function manejarAccion(accion, id) {
        if (accion === "expediente") {
            Toast.info("El expediente del paciente se implementará en la próxima etapa.");
            return;
        }
        if (accion === "editar") {
            Toast.info("El modal de edición se implementará en la próxima etapa.");
            return;
        }
        if (accion === "desactivar") {
            if (!confirm("¿Desactivar este paciente?")) return;
            try {
                await Api.delete("/pacientes/" + id);
                Toast.exito("Paciente desactivado.");
                cargar();
            } catch (err) {
                if (err.status !== 401) Toast.error("No se pudo desactivar: " + err.message);
            }
            return;
        }
        if (accion === "reactivar") {
            if (!confirm("¿Reactivar este paciente?")) return;
            try {
                await Api.patch("/pacientes/" + id + "/reactivar");
                Toast.exito("Paciente reactivado.");
                cargar();
            } catch (err) {
                if (err.status !== 401) Toast.error("No se pudo reactivar: " + err.message);
            }
            return;
        }
    }

    // Filtros
    document.getElementById("btnBuscar").addEventListener("click", () => {
        estado.pagina = 1;
        estado.filtros.busqueda = document.getElementById("filtroBusqueda").value.trim();
        estado.filtros.activo = document.getElementById("filtroActivo").value;
        estado.filtros.sexo = document.getElementById("filtroSexo").value;
        cargar();
    });

    document.getElementById("btnLimpiar").addEventListener("click", () => {
        document.getElementById("filtroBusqueda").value = "";
        document.getElementById("filtroActivo").value = "true";
        document.getElementById("filtroSexo").value = "";
        estado.pagina = 1;
        estado.filtros = { busqueda: "", activo: "true", sexo: "" };
        cargar();
    });

    document.getElementById("filtroBusqueda").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("btnBuscar").click();
        }
    });

    document.getElementById("btnNuevo").addEventListener("click", () => {
        Toast.info("El modal de creación se implementará en la próxima etapa.");
    });

    // Helpers
    function esc(texto) {
        if (texto === null || texto === undefined) return "";
        const div = document.createElement("div");
        div.textContent = String(texto);
        return div.innerHTML;
    }

    function etiquetaSexo(s) {
        return { "M": "Masculino", "F": "Femenino" }[s] || "—";
    }

    // Arranque
    cargar();
};