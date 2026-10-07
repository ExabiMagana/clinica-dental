window.onLayoutReady = function () {

    // Referencias
    const tabla = document.getElementById("tablaPacientes");
    const paginacion = document.getElementById("paginacion");
    const infoPaginacion = document.getElementById("infoPaginacion");
    const totalBadge = document.getElementById("totalPacientes");

    const modalElement = document.getElementById("modalPaciente");
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById("formPaciente");
    const alertaForm = document.getElementById("erroresFormulario");

    const estado = {
        pagina: 1,
        tamano: 10,
        filtros: { busqueda: "", activo: "true", sexo: "" }
    };

    // Listado
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
            btn.addEventListener("click", () =>
                manejarAccion(btn.dataset.accion, parseInt(btn.dataset.id)));
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

    // Acciones de la fila
    async function manejarAccion(accion, id) {
        if (accion === "expediente") {
            window.location.href = "historia-medica.html?pacienteId=" + id;
            return;
        }
        if (accion === "editar") return abrirEditar(id);
        if (accion === "desactivar") return desactivar(id);
        if (accion === "reactivar") return reactivar(id);
    }

    async function desactivar(id) {
        if (!confirm("¿Desactivar este paciente? Se marcará como inactivo, no se elimina.")) return;
        try {
            await Api.delete("/pacientes/" + id);
            Toast.exito("Paciente desactivado.");
            cargar();
        } catch (err) {
            if (err.status !== 401) Toast.error("No se pudo desactivar: " + err.message);
        }
    }

    async function reactivar(id) {
        if (!confirm("¿Reactivar este paciente?")) return;
        try {
            await Api.patch("/pacientes/" + id + "/reactivar");
            Toast.exito("Paciente reactivado.");
            cargar();
        } catch (err) {
            if (err.status !== 401) Toast.error("No se pudo reactivar: " + err.message);
        }
    }

    // Modal: crear / editar
    document.getElementById("btnNuevo").addEventListener("click", abrirNuevo);

    function abrirNuevo() {
        form.reset();
        document.getElementById("pacienteId").value = "";
        document.getElementById("tituloModal").textContent = "Nuevo paciente";
        document.getElementById("contenedorActivo").style.display = "none";
        ocultarErroresForm();
        modal.show();
    }

    async function abrirEditar(id) {
        try {
            const p = await Api.get("/pacientes/" + id);

            document.getElementById("tituloModal").textContent = "Editar paciente";
            document.getElementById("pacienteId").value = p.id;
            document.getElementById("nombres").value = p.nombres ?? "";
            document.getElementById("apellidos").value = p.apellidos ?? "";
            document.getElementById("documento").value = p.documento ?? "";
            document.getElementById("fechaNacimiento").value =
                (p.fechaNacimiento || "").substring(0, 10);
            document.getElementById("sexo").value = p.sexo ?? "";
            document.getElementById("telefono").value = p.telefono ?? "";
            document.getElementById("email").value = p.email ?? "";
            document.getElementById("direccion").value = p.direccion ?? "";
            document.getElementById("contactoEmergenciaNombre").value =
                p.contactoEmergenciaNombre ?? "";
            document.getElementById("contactoEmergenciaTelefono").value =
                p.contactoEmergenciaTelefono ?? "";
            document.getElementById("observaciones").value = p.observaciones ?? "";

            document.getElementById("contenedorActivo").style.display = "block";
            document.getElementById("activo").checked = p.activo;

            ocultarErroresForm();
            modal.show();
        } catch (err) {
            if (err.status !== 401) Toast.error("No se pudo cargar el paciente: " + err.message);
        }
    }

    // Submit del modal
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        ocultarErroresForm();

        const id = document.getElementById("pacienteId").value;
        const esEdicion = !!id;

        const body = {
            nombres: document.getElementById("nombres").value.trim(),
            apellidos: document.getElementById("apellidos").value.trim(),
            documento: document.getElementById("documento").value.trim() || null,
            fechaNacimiento: document.getElementById("fechaNacimiento").value,
            sexo: document.getElementById("sexo").value,
            telefono: document.getElementById("telefono").value.trim() || null,
            email: document.getElementById("email").value.trim() || null,
            direccion: document.getElementById("direccion").value.trim() || null,
            contactoEmergenciaNombre:
                document.getElementById("contactoEmergenciaNombre").value.trim() || null,
            contactoEmergenciaTelefono:
                document.getElementById("contactoEmergenciaTelefono").value.trim() || null,
            observaciones: document.getElementById("observaciones").value.trim() || null
        };

        if (esEdicion) {
            body.activo = document.getElementById("activo").checked;
        }

        // Validación mínima en el cliente
        if (!body.nombres || !body.apellidos || !body.fechaNacimiento || !body.sexo) {
            mostrarErroresForm(["Nombres, apellidos, fecha de nacimiento y sexo son obligatorios."]);
            return;
        }

        const btn = document.getElementById("btnGuardar");
        const spinner = document.getElementById("spinnerGuardar");
        const texto = document.getElementById("textoGuardar");
        btn.disabled = true;
        spinner.classList.remove("d-none");
        texto.textContent = "Guardando…";

        try {
            if (esEdicion) {
                await Api.put("/pacientes/" + id, body);
                Toast.exito("Paciente actualizado.");
            } else {
                await Api.post("/pacientes", body);
                Toast.exito("Paciente creado.");
            }
            modal.hide();
            cargar();
        } catch (err) {
            if (err.status === 401) return;
            mostrarErroresForm(extraerMensajesError(err));
        } finally {
            btn.disabled = false;
            spinner.classList.add("d-none");
            texto.textContent = "Guardar";
        }
    });

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

    function mostrarErroresForm(mensajes) {
        alertaForm.innerHTML = "<ul class='mb-0'>" +
            mensajes.map(m => `<li>${esc(m)}</li>`).join("") +
            "</ul>";
        alertaForm.classList.remove("d-none");
    }

    function ocultarErroresForm() {
        alertaForm.classList.add("d-none");
        alertaForm.innerHTML = "";
    }

    function extraerMensajesError(err) {
        // Errores de validación del backend: { errores: { Campo: ["msg", ...] } }
        if (err.data && err.data.errores) {
            const lista = [];
            for (const campo in err.data.errores) {
                err.data.errores[campo].forEach(m => lista.push(m));
            }
            return lista;
        }
        // Error genérico con mensaje
        return [err.message || "Error al guardar."];
    }

    // Arranque
    cargar();
};