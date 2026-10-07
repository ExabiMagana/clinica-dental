// Módulo de Consultas.

window.onLayoutReady = function () {

    // ────────────────────────────────────────────
    // Referencias
    // ────────────────────────────────────────────
    const tabla = document.getElementById("tablaConsultas");
    const paginacion = document.getElementById("paginacion");
    const infoPaginacion = document.getElementById("infoPaginacion");
    const totalBadge = document.getElementById("totalConsultas");

    const modalElement = document.getElementById("modalConsulta");
    const modal = new bootstrap.Modal(modalElement);
    const form = document.getElementById("formConsulta");
    const alertaForm = document.getElementById("erroresFormulario");

    const selectPaciente = document.getElementById("pacienteId");
    const selectOdontologo = document.getElementById("odontologoId");
    const selectCita = document.getElementById("citaId");
    const selectFiltroPaciente = document.getElementById("filtroPaciente");

    let pacientesCache = [];
    let odontologosCache = [];

    // Cache de citas del paciente seleccionado en el modal
    let citasPacienteCache = [];

    const estado = {
        pagina: 1,
        tamano: 10,
        filtros: { pacienteId: "", desde: "", hasta: "", conCita: "", busqueda: "" }
    };

    // Fechas por defecto: últimos 30 días
    const hoy = new Date();
    const hoyISO = toISODate(hoy);
    const hace30 = new Date(hoy.getTime() - 30 * 24 * 60 * 60 * 1000);
    const hace30ISO = toISODate(hace30);

    document.getElementById("filtroDesde").value = hace30ISO;
    document.getElementById("filtroHasta").value = hoyISO;
    estado.filtros.desde = hace30ISO;
    estado.filtros.hasta = hoyISO;

    // ────────────────────────────────────────────
    // Cargar catálogos
    // ────────────────────────────────────────────
    async function cargarCatalogos() {
        try {
            const [pacientes, odontologos] = await Promise.all([
                Api.get("/pacientes?activo=true&tamano=100"),
                Api.get("/usuarios/odontologos")
            ]);

            pacientesCache = pacientes.items;
            odontologosCache = odontologos;

            // Select del filtro
            selectFiltroPaciente.innerHTML = '<option value="">Todos</option>' +
                pacientesCache.map(p =>
                    `<option value="${p.id}">${esc(p.nombres)} ${esc(p.apellidos)}</option>`
                ).join("");

            // Select del modal
            selectPaciente.innerHTML = '<option value="">Seleccione…</option>' +
                pacientesCache.map(p =>
                    `<option value="${p.id}">${esc(p.nombres)} ${esc(p.apellidos)}</option>`
                ).join("");

            selectOdontologo.innerHTML = '<option value="">Seleccione…</option>' +
                odontologosCache.map(o =>
                    `<option value="${o.id}">${esc(o.nombreCompleto)}</option>`
                ).join("");
        } catch (err) {
            if (err.status !== 401) Toast.error("No se pudieron cargar los catálogos.");
        }
    }

    // ────────────────────────────────────────────
    // Listado
    // ────────────────────────────────────────────
    async function cargar() {
        tabla.innerHTML =
            `<tr><td colspan="7" class="text-center text-muted py-4">Cargando…</td></tr>`;

        const params = new URLSearchParams();
        params.set("pagina", estado.pagina);
        params.set("tamano", estado.tamano);
        if (estado.filtros.pacienteId) params.set("pacienteId", estado.filtros.pacienteId);
        if (estado.filtros.desde) params.set("desde", estado.filtros.desde);
        if (estado.filtros.hasta) params.set("hasta", estado.filtros.hasta);
        if (estado.filtros.conCita !== "") params.set("conCita", estado.filtros.conCita);
        if (estado.filtros.busqueda) params.set("busqueda", estado.filtros.busqueda);

        try {
            const data = await Api.get("/consultas?" + params.toString());
            totalBadge.textContent = data.total;
            renderTabla(data.items);
            renderPaginacion(data);
        } catch (err) {
            if (err.status === 401) return;
            tabla.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">
                Error al cargar: ${esc(err.message)}
            </td></tr>`;
        }
    }

    function renderTabla(items) {
        if (!items || items.length === 0) {
            tabla.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-4">
                No hay consultas que coincidan con los filtros.
            </td></tr>`;
            return;
        }

        tabla.innerHTML = items.map(c => {
            const fecha = formatearFecha(c.fecha);
            const origen = c.citaId
                ? `<span class="badge bg-info text-dark">Cita #${c.citaId}</span>`
                : `<span class="badge bg-secondary">Espontánea</span>`;

            return `
                <tr>
                    <td>${fecha}</td>
                    <td>${esc(c.pacienteNombre)}</td>
                    <td>${esc(c.odontologoNombre)}</td>
                    <td>${esc(c.motivoConsulta)}</td>
                    <td>${esc(c.diagnostico) || "<span class='text-muted'>—</span>"}</td>
                    <td>${origen}</td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary"
                                data-accion="expediente"
                                data-paciente="${c.pacienteId}"
                                title="Ver expediente del paciente">
                            <i class="bi bi-folder2-open"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary"
                                data-accion="editar" data-id="${c.id}" title="Editar">
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        tabla.querySelectorAll("button[data-accion]").forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.dataset.accion === "expediente") {
                    window.location.href =
                        "historia-medica.html?pacienteId=" + btn.dataset.paciente;
                } else if (btn.dataset.accion === "editar") {
                    abrirEditar(parseInt(btn.dataset.id));
                }
            });
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

        for (let i = desde; i <= hasta; i++) {
            crearBoton(i.toString(), i, false, i === data.pagina);
        }
        crearBoton("»", data.pagina + 1, data.pagina === data.totalPaginas);
    }

    // ────────────────────────────────────────────
    // Modal: nueva / editar
    // ────────────────────────────────────────────

    document.getElementById("btnNueva").addEventListener("click", () => {
        abrirNueva();
    });

    function abrirNueva() {
        form.reset();
        document.getElementById("consultaId").value = "";
        document.getElementById("tituloModal").textContent = "Nueva consulta";
        ocultarErrores();

        // Fecha actual por defecto
        const ahora = new Date();
        document.getElementById("fecha").value = formatearDateTimeLocal(ahora);

        // Reset del select de citas
        selectCita.innerHTML =
            '<option value="">Sin cita (consulta espontánea)</option>';

        // El paciente y odontólogo no están bloqueados
        selectPaciente.disabled = false;
        selectCita.disabled = false;

        modal.show();
    }

    /**
     * Cuando cambia el paciente en el modal, recargamos las citas disponibles.
     */
    selectPaciente.addEventListener("change", async () => {
        const pacienteId = selectPaciente.value;

        if (!pacienteId) {
            selectCita.innerHTML =
                '<option value="">Sin cita (consulta espontánea)</option>';
            return;
        }

        await cargarCitasDelPaciente(pacienteId);
    });

    async function cargarCitasDelPaciente(pacienteId) {
        selectCita.innerHTML =
            '<option value="">Cargando citas…</option>';

        try {
            // Traemos las citas del paciente, con foco en las programadas/confirmadas
            // de los últimos 30 días hasta hoy + 30 días
            const desde = toISODate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
            const hasta = toISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

            const data = await Api.get(
                `/citas?pacienteId=${pacienteId}&desde=${desde}&hasta=${hasta}&tamano=100`
            );

            // Filtramos las que ya están atendidas (no se pueden asociar)
            // y las canceladas/no asistió
            citasPacienteCache = data.items.filter(c =>
                c.estadoCitaNombre === "Programada" ||
                c.estadoCitaNombre === "Confirmada"
            );

            let html = '<option value="">Sin cita (consulta espontánea)</option>';

            if (citasPacienteCache.length === 0) {
                html += `<option value="" disabled>
                    (No hay citas disponibles en los próximos días)
                </option>`;
            } else {
                html += citasPacienteCache.map(c => {
                    const fecha = c.fechaHoraInicio.substring(0, 10);
                    const hora = c.fechaHoraInicio.substring(11, 16);
                    return `<option value="${c.id}">
                        ${fecha} ${hora} — ${esc(c.estadoCitaNombre)}
                    </option>`;
                }).join("");
            }

            selectCita.innerHTML = html;
        } catch (err) {
            if (err.status !== 401)
                Toast.error("No se pudieron cargar las citas: " + err.message);
            selectCita.innerHTML =
                '<option value="">Sin cita (consulta espontánea)</option>';
        }
    }

    async function abrirEditar(id) {
        try {
            const c = await Api.get("/consultas/" + id);

            document.getElementById("tituloModal").textContent = "Editar consulta";
            document.getElementById("consultaId").value = c.id;
            selectPaciente.value = c.pacienteId;
            selectOdontologo.value = c.odontologoId;

            // El paciente y la cita no se pueden cambiar en edición.
            selectPaciente.disabled = true;
            selectCita.disabled = true;

            // Mostrar la cita asociada (si existe) como opción fija
            if (c.citaId) {
                const fechaCita = c.citaFechaHora
                    ? c.citaFechaHora.substring(0, 16).replace("T", " ")
                    : "";
                selectCita.innerHTML = `<option value="${c.citaId}">
                    Cita #${c.citaId} — ${fechaCita}
                </option>`;
                selectCita.value = c.citaId;
            } else {
                selectCita.innerHTML =
                    '<option value="">Sin cita (consulta espontánea)</option>';
            }

            document.getElementById("fecha").value =
                c.fecha ? c.fecha.substring(0, 16) : formatearDateTimeLocal(new Date());

            document.getElementById("motivoConsulta").value = c.motivoConsulta ?? "";
            document.getElementById("diagnostico").value = c.diagnostico ?? "";
            document.getElementById("procedimientosRealizados").value =
                c.procedimientosRealizados ?? "";
            document.getElementById("medicamentos").value = c.medicamentos ?? "";
            document.getElementById("recomendaciones").value = c.recomendaciones ?? "";
            document.getElementById("observaciones").value = c.observaciones ?? "";

            ocultarErrores();
            modal.show();
        } catch (err) {
            if (err.status !== 401)
                Toast.error("No se pudo cargar la consulta: " + err.message);
        }
    }

    // ────────────────────────────────────────────
    // Submit del modal
    // ────────────────────────────────────────────
    form.addEventListener("submit", async (e) => {
        e.preventDefault();
        ocultarErrores();

        const id = document.getElementById("consultaId").value;
        const esEdicion = !!id;

        const pacienteId = parseInt(selectPaciente.value) || 0;
        const odontologoId = parseInt(selectOdontologo.value) || 0;
        const citaId = selectCita.value ? parseInt(selectCita.value) : null;
        const fecha = document.getElementById("fecha").value;
        const motivoConsulta = document.getElementById("motivoConsulta").value.trim();

        if (!pacienteId || !odontologoId || !motivoConsulta) {
            mostrarErrores([
                "Paciente, odontólogo y motivo de consulta son obligatorios."
            ]);
            return;
        }

        const body = {
            pacienteId,
            odontologoId,
            citaId,
            fecha: fecha || null,
            motivoConsulta,
            diagnostico: document.getElementById("diagnostico").value.trim() || null,
            procedimientosRealizados:
                document.getElementById("procedimientosRealizados").value.trim() || null,
            medicamentos: document.getElementById("medicamentos").value.trim() || null,
            recomendaciones: document.getElementById("recomendaciones").value.trim() || null,
            observaciones: document.getElementById("observaciones").value.trim() || null
        };

        // En edición, el backend no acepta pacienteId ni citaId, los quitamos
        if (esEdicion) {
            delete body.pacienteId;
            delete body.citaId;
        }

        const btn = document.getElementById("btnGuardar");
        const spinner = document.getElementById("spinnerGuardar");
        const texto = document.getElementById("textoGuardar");
        btn.disabled = true;
        spinner.classList.remove("d-none");
        texto.textContent = "Guardando…";

        try {
            if (esEdicion) {
                await Api.put("/consultas/" + id, body);
                Toast.exito("Consulta actualizada.");
            } else {
                await Api.post("/consultas", body);
                Toast.exito("Consulta registrada.");
            }
            modal.hide();
            cargar();
        } catch (err) {
            if (err.status === 401) return;
            mostrarErrores(extraerMensajesError(err));
        } finally {
            btn.disabled = false;
            spinner.classList.add("d-none");
            texto.textContent = "Guardar";
        }
    });

    // ────────────────────────────────────────────
    // Filtros
    // ────────────────────────────────────────────
    document.getElementById("btnBuscar").addEventListener("click", () => {
        estado.pagina = 1;
        estado.filtros.pacienteId = document.getElementById("filtroPaciente").value;
        estado.filtros.desde = document.getElementById("filtroDesde").value;
        estado.filtros.hasta = document.getElementById("filtroHasta").value;
        estado.filtros.conCita = document.getElementById("filtroConCita").value;
        estado.filtros.busqueda = document.getElementById("filtroBusqueda").value.trim();
        cargar();
    });

    document.getElementById("btnLimpiar").addEventListener("click", () => {
        document.getElementById("filtroPaciente").value = "";
        document.getElementById("filtroDesde").value = hace30ISO;
        document.getElementById("filtroHasta").value = hoyISO;
        document.getElementById("filtroConCita").value = "";
        document.getElementById("filtroBusqueda").value = "";
        estado.pagina = 1;
        estado.filtros = {
            pacienteId: "", desde: hace30ISO, hasta: hoyISO,
            conCita: "", busqueda: ""
        };
        cargar();
    });

    document.getElementById("filtroBusqueda").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("btnBuscar").click();
        }
    });

    // ────────────────────────────────────────────
    // Helpers
    // ────────────────────────────────────────────
    function esc(texto) {
        if (texto === null || texto === undefined) return "";
        const div = document.createElement("div");
        div.textContent = String(texto);
        return div.innerHTML;
    }

    function formatearFecha(iso) {
        if (!iso) return "—";
        const d = new Date(iso);
        return d.toLocaleString("es-SV", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    }

    function formatearDateTimeLocal(fecha) {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, "0");
        const d = String(fecha.getDate()).padStart(2, "0");
        const hh = String(fecha.getHours()).padStart(2, "0");
        const mm = String(fecha.getMinutes()).padStart(2, "0");
        return `${y}-${m}-${d}T${hh}:${mm}`;
    }

    function toISODate(fecha) {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, "0");
        const d = String(fecha.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    function mostrarErrores(mensajes) {
        alertaForm.innerHTML = "<ul class='mb-0'>" +
            mensajes.map(m => `<li>${esc(m)}</li>`).join("") + "</ul>";
        alertaForm.classList.remove("d-none");
    }

    function ocultarErrores() {
        alertaForm.classList.add("d-none");
        alertaForm.innerHTML = "";
    }

    function extraerMensajesError(err) {
        if (err.data && err.data.errores) {
            const lista = [];
            for (const campo in err.data.errores) {
                err.data.errores[campo].forEach(m => lista.push(m));
            }
            return lista;
        }
        return [err.message || "Error al guardar."];
    }

    // ────────────────────────────────────────────
    // Arranque
    // ────────────────────────────────────────────
    (async () => {
        await cargarCatalogos();
        cargar();
    })();
};