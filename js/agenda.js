// Módulo de Agenda — citas (vista Lista + vista Calendario).

window.onLayoutReady = function () {

    // ────────────────────────────────────────────
    // Referencias — vista Lista
    // ────────────────────────────────────────────
    const tabla = document.getElementById("tablaCitas");
    const paginacion = document.getElementById("paginacion");
    const infoPaginacion = document.getElementById("infoPaginacion");
    const totalBadge = document.getElementById("totalCitas");
    const citasHoyContainer = document.getElementById("citasHoy");
    const contadorHoy = document.getElementById("contadorHoy");

    // Referencias — vista Calendario
    const calendarioHeader = document.getElementById("calendarioHeader");
    const calendarioHoras = document.getElementById("calendarioHoras");
    const calendarioGrid = document.getElementById("calendarioGrid");
    const tituloSemana = document.getElementById("tituloSemana");
    const vistaCalendario = document.getElementById("vistaCalendario");
    const vistaLista = document.getElementById("vistaLista");

    // Modales y forms
    const modalCitaElement = document.getElementById("modalCita");
    const modalCita = new bootstrap.Modal(modalCitaElement);
    const formCita = document.getElementById("formCita");
    const alertaForm = document.getElementById("erroresFormulario");

    const modalEstadoElement = document.getElementById("modalEstado");
    const modalEstado = new bootstrap.Modal(modalEstadoElement);
    const formEstado = document.getElementById("formEstado");
    const alertaEstado = document.getElementById("erroresEstado");

    const selectPaciente = document.getElementById("pacienteId");
    const selectOdontologo = document.getElementById("odontologoId");
    const selectNuevoEstado = document.getElementById("nuevoEstado");
    const selectFiltroEstado = document.getElementById("filtroEstado");

    // Catálogos
    let estadosCita = [];
    let pacientesCache = [];
    let odontologosCache = [];

    // Estado de la vista Lista
    const estado = {
        pagina: 1,
        tamano: 10,
        filtros: { desde: "", hasta: "", busqueda: "", estadoCitaId: "" }
    };

    // Estado de la vista Calendario
    const calendarState = {
        // Lunes de la semana mostrada (a las 00:00 locales)
        fechaInicio: primerDiaDeSemana(new Date())
    };

    // Config
    const HORA_INICIO = 8;
    const HORA_FIN = 18;
    const PX_POR_HORA = 60;

    // ────────────────────────────────────────────
    // Fechas por defecto (vista Lista)
    // ────────────────────────────────────────────
    const hoy = new Date();
    const hoyISO = toISODate(hoy);
    const en30Dias = toISODate(new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000));

    document.getElementById("filtroDesde").value = hoyISO;
    document.getElementById("filtroHasta").value = en30Dias;
    estado.filtros.desde = hoyISO;
    estado.filtros.hasta = en30Dias;

    // ────────────────────────────────────────────
    // Cargar catálogos
    // ────────────────────────────────────────────
    async function cargarCatalogos() {
        try {
            const [estados, pacientes, odontologos] = await Promise.all([
                Api.get("/citas/estados"),
                Api.get("/pacientes?activo=true&tamano=100"),
                Api.get("/usuarios/odontologos")
            ]);

            estadosCita = estados;
            pacientesCache = pacientes.items;
            odontologosCache = odontologos;

            selectFiltroEstado.innerHTML = '<option value="">Todos</option>' +
                estados.map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join("");

            selectNuevoEstado.innerHTML = '<option value="">Seleccione…</option>' +
                estados.map(e => `<option value="${e.id}">${esc(e.nombre)}</option>`).join("");

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

    // ════════════════════════════════════════════
    // VISTA LISTA
    // ════════════════════════════════════════════

    async function cargarHoy() {
        citasHoyContainer.innerHTML =
            `<div class="col-12 text-center text-muted py-3">Cargando…</div>`;

        try {
            const lista = await Api.get("/citas/hoy");
            contadorHoy.textContent = lista.length;

            if (lista.length === 0) {
                citasHoyContainer.innerHTML =
                    `<div class="col-12 text-center text-muted py-3">
                        No hay citas programadas para hoy.
                    </div>`;
                return;
            }

            citasHoyContainer.innerHTML = lista.map(c => {
                const hora = c.fechaHoraInicio.substring(11, 16);
                const color = colorEstado(c.estadoCitaNombre);
                return `
                    <div class="col-md-6 col-lg-4">
                        <div class="border rounded p-2 h-100">
                            <div class="d-flex justify-content-between align-items-start">
                                <strong>${hora}</strong>
                                <span class="badge bg-${color}">${esc(c.estadoCitaNombre)}</span>
                            </div>
                            <div class="small mt-1">${esc(c.pacienteNombre)}</div>
                            <div class="small text-muted">${esc(c.odontologoNombre)}</div>
                            ${c.motivo ? `<div class="small text-muted fst-italic mt-1">${esc(c.motivo)}</div>` : ""}
                        </div>
                    </div>
                `;
            }).join("");
        } catch (err) {
            if (err.status === 401) return;
            citasHoyContainer.innerHTML =
                `<div class="col-12 text-center text-danger py-3">
                    Error al cargar: ${esc(err.message)}
                </div>`;
        }
    }

    async function cargarLista() {
        tabla.innerHTML =
            `<tr><td colspan="7" class="text-center text-muted py-4">Cargando…</td></tr>`;

        const params = new URLSearchParams();
        params.set("pagina", estado.pagina);
        params.set("tamano", estado.tamano);
        if (estado.filtros.desde) params.set("desde", estado.filtros.desde);
        if (estado.filtros.hasta) params.set("hasta", estado.filtros.hasta);
        if (estado.filtros.busqueda) params.set("busqueda", estado.filtros.busqueda);
        if (estado.filtros.estadoCitaId) params.set("estadoCitaId", estado.filtros.estadoCitaId);

        try {
            const data = await Api.get("/citas?" + params.toString());
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
                No hay citas que coincidan con los filtros.
            </td></tr>`;
            return;
        }

        tabla.innerHTML = items.map(c => {
            const fecha = c.fechaHoraInicio.substring(0, 10);
            const horaInicio = c.fechaHoraInicio.substring(11, 16);
            const horaFin = c.fechaHoraFin.substring(11, 16);
            const color = colorEstado(c.estadoCitaNombre);
            const esFinal = ["Atendida", "Cancelada", "NoAsistio"].includes(c.estadoCitaNombre);

            return `
                <tr>
                    <td>${fecha}</td>
                    <td>${horaInicio} – ${horaFin}</td>
                    <td>${esc(c.pacienteNombre)}</td>
                    <td>${esc(c.odontologoNombre)}</td>
                    <td>${esc(c.motivo) || "<span class='text-muted'>—</span>"}</td>
                    <td><span class="badge bg-${color}">${esc(c.estadoCitaNombre)}</span></td>
                    <td class="text-end">
                        <button class="btn btn-sm btn-outline-secondary"
                                data-accion="estado" data-id="${c.id}" title="Cambiar estado">
                            <i class="bi bi-arrow-repeat"></i>
                        </button>
                        <button class="btn btn-sm btn-outline-primary"
                                data-accion="editar" data-id="${c.id}"
                                title="${esFinal ? "No se puede editar en estado final" : "Editar"}"
                                ${esFinal ? "disabled" : ""}>
                            <i class="bi bi-pencil"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

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
                cargarLista();
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

    // ════════════════════════════════════════════
    // VISTA CALENDARIO
    // ════════════════════════════════════════════

    async function cargarCalendario() {
        renderCabeceraHoras();
        renderHeaderDias();
        calendarioGrid.innerHTML = "";

        try {
            const desde = toISODate(calendarState.fechaInicio) + "T00:00:00";
            const finDate = new Date(calendarState.fechaInicio);
            finDate.setDate(finDate.getDate() + 6);
            const hasta = toISODate(finDate) + "T23:59:59";

            const params = new URLSearchParams();
            params.set("desde", desde.substring(0, 10));
            params.set("hasta", hasta.substring(0, 10));
            params.set("tamano", "500");

            const data = await Api.get("/citas?" + params.toString());

            renderCeldasVacio();
            renderCitasEnCalendario(data.items);
        } catch (err) {
            if (err.status === 401) return;
            Toast.error("No se pudieron cargar las citas: " + err.message);
        }
    }

    function renderCabeceraHoras() {
        let html = `<div class="col-hora"></div>`;
        calendarioHeader.innerHTML = html;

        // Horas en la columna izquierda
        let horasHtml = "";
        for (let h = HORA_INICIO; h < HORA_FIN; h++) {
            horasHtml += `<div class="hora">${String(h).padStart(2, "0")}:00</div>`;
        }
        calendarioHoras.innerHTML = horasHtml;
    }

    function renderHeaderDias() {
        const inicio = calendarState.fechaInicio;
        const hoyDate = new Date();
        hoyDate.setHours(0, 0, 0, 0);

        let html = `<div class="col-hora"></div>`;
        const nombresDias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

        for (let i = 0; i < 7; i++) {
            const d = new Date(inicio);
            d.setDate(d.getDate() + i);
            const esHoy = d.getTime() === hoyDate.getTime();
            const diaSemana = nombresDias[d.getDay()];
            const numeroDia = d.getDate();
            const mesCorto = d.toLocaleString("es-SV", { month: "short" });

            html += `
                <div class="col-dia ${esHoy ? "hoy" : ""}">
                    <div class="nombre-dia">${diaSemana}</div>
                    <div class="numero-dia">${numeroDia}</div>
                    <div class="small text-muted">${mesCorto}</div>
                </div>
            `;
        }
        calendarioHeader.innerHTML = html;

        // Título de la semana
        const fin = new Date(inicio);
        fin.setDate(fin.getDate() + 6);
        const mesInicio = inicio.toLocaleString("es-SV", { month: "long" });
        const mesFin = fin.toLocaleString("es-SV", { month: "long" });
        const anio = fin.getFullYear();

        const rango = mesInicio === mesFin
            ? `${inicio.getDate()} – ${fin.getDate()} de ${mesInicio} de ${anio}`
            : `${inicio.getDate()} ${mesInicio} – ${fin.getDate()} ${mesFin} de ${anio}`;

        tituloSemana.textContent = rango;
    }

    function renderCeldasVacio() {
        let html = "";
        const totalFilas = HORA_FIN - HORA_INICIO;

        for (let fila = 0; fila < totalFilas; fila++) {
            const hora = HORA_INICIO + fila;
            for (let col = 0; col < 7; col++) {
                html += `
                    <div class="celda"
                        data-fila="${fila}"
                        data-col="${col}"
                        data-hora="${hora}"
                        title="Clic para crear cita a las ${String(hora).padStart(2, "0")}:00">
                    </div>
                `;
            }
        }
        calendarioGrid.innerHTML = html;

        // Conectar clics en celdas vacías
        calendarioGrid.querySelectorAll(".celda").forEach(celda => {
            celda.addEventListener("click", () => {
                const hora = parseInt(celda.dataset.hora);
                const col = parseInt(celda.dataset.col);
                abrirNuevaDesdeCelda(hora, col);
            });
        });
    }

    function renderCitasEnCalendario(citas) {
        if (!citas || citas.length === 0) return;

        const inicioSemana = calendarState.fechaInicio;
        const hoyDate = new Date();
        hoyDate.setHours(0, 0, 0, 0);

        // Línea de hora actual
        if (esSemanaActual(inicioSemana)) {
            renderLineaHoraActual();
        }

        citas.forEach(c => {
            const inicio = new Date(c.fechaHoraInicio);
            const fin = new Date(c.fechaHoraFin);

            // ¿En qué columna cae?
            const dia = new Date(inicio);
            dia.setHours(0, 0, 0, 0);
            const diffDias = Math.round((dia - inicioSemana) / (1000 * 60 * 60 * 24));
            if (diffDias < 0 || diffDias > 6) return; // fuera de la semana mostrada

            // Hora y minutos
            const hh = inicio.getHours();
            const mm = inicio.getMinutes();

            // Si empieza antes del rango visible, la recortamos
            if (hh >= HORA_FIN) return;
            if (hh < HORA_INICIO) return; // simplificamos: solo mostramos las que caen dentro

            // Calcular offset vertical dentro de la grilla
            const offsetHoras = (hh - HORA_INICIO) + (mm / 60);
            const topPx = offsetHoras * PX_POR_HORA;

            // Duración en px (mínimo 20px para que sea visible)
            const duracionMin = Math.max(15, (fin - inicio) / (1000 * 60));
            const altoPx = Math.max(22, (duracionMin / 60) * PX_POR_HORA);

            const claseEstado = claseEstadoCita(c.estadoCitaNombre);
            const horaInicioStr = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
            const horaFinStr = String(fin.getHours()).padStart(2, "0") +
                              ":" + String(fin.getMinutes()).padStart(2, "0");

            const bloque = document.createElement("div");
            bloque.className = `cita-bloque ${claseEstado}`;
            bloque.style.position = "absolute";
            bloque.style.top = topPx + "px";
            bloque.style.height = altoPx + "px";
            bloque.style.left = `calc(${diffDias} * 100% / 7 + 2px)`;
            bloque.style.width = `calc(100% / 7 - 4px)`;

            bloque.innerHTML = `
                <div class="cb-hora">${horaInicioStr}</div>
                <div class="cb-paciente">${esc(c.pacienteNombre)}</div>
                <div class="cb-paciente">${horaFinStr}</div>
            `;

            bloque.title = `${horaInicioStr} – ${horaFinStr}\n${c.pacienteNombre}\n${c.motivo || ""}`;
            bloque.dataset.id = c.id;

            // Evitar que el clic en el bloque llegue a la celda de abajo
            bloque.addEventListener("click", (e) => {
                e.stopPropagation();
                abrirEditar(c.id);
            });

            calendarioGrid.appendChild(bloque);
        });
    }

    function renderLineaHoraActual() {
        const ahora = new Date();
        const offsetHoras = (ahora.getHours() - HORA_INICIO) + (ahora.getMinutes() / 60);
        if (offsetHoras < 0 || offsetHoras > (HORA_FIN - HORA_INICIO)) return;

        const linea = document.createElement("div");
        linea.className = "linea-hora-actual";
        linea.style.top = (offsetHoras * PX_POR_HORA) + "px";
        calendarioGrid.appendChild(linea);
    }

    // ════════════════════════════════════════════
    // Toggle vista Lista / Calendario
    // ════════════════════════════════════════════

    function aplicarVista(vista) {
        if (vista === "calendario") {
            vistaCalendario.style.display = "";
            vistaLista.style.display = "none";
            document.getElementById("btnVistaCalendario").classList.add("active");
            document.getElementById("btnVistaLista").classList.remove("active");
            cargarCalendario();
        } else {
            vistaCalendario.style.display = "none";
            vistaLista.style.display = "";
            document.getElementById("btnVistaLista").classList.add("active");
            document.getElementById("btnVistaCalendario").classList.remove("active");
            cargarHoy();
            cargarLista();
        }
        localStorage.setItem("agenda_vista", vista);
    }

    document.getElementById("btnVistaCalendario").addEventListener("click", () => aplicarVista("calendario"));
    document.getElementById("btnVistaLista").addEventListener("click", () => aplicarVista("lista"));

    document.getElementById("btnSemanaAnterior").addEventListener("click", () => {
        calendarState.fechaInicio.setDate(calendarState.fechaInicio.getDate() - 7);
        cargarCalendario();
    });

    document.getElementById("btnSemanaSiguiente").addEventListener("click", () => {
        calendarState.fechaInicio.setDate(calendarState.fechaInicio.getDate() + 7);
        cargarCalendario();
    });

    document.getElementById("btnHoy").addEventListener("click", () => {
        calendarState.fechaInicio = primerDiaDeSemana(new Date());
        cargarCalendario();
    });

    // ════════════════════════════════════════════
    // Modales: crear/editar y cambiar estado
    // ════════════════════════════════════════════

    async function manejarAccion(accion, id) {
        if (accion === "editar") return abrirEditar(id);
        if (accion === "estado") return abrirCambiarEstado(id);
    }

    document.getElementById("btnNueva").addEventListener("click", abrirNueva);

    function abrirNueva() {
        formCita.reset();
        document.getElementById("citaId").value = "";
        document.getElementById("tituloModal").textContent = "Nueva cita";
        ocultarErroresForm(alertaForm);

        const ahora = new Date();
        const hoy = toISODate(ahora);
        const hh = String(ahora.getHours()).padStart(2, "0");
        const mm = String(ahora.getMinutes()).padStart(2, "0");
        document.getElementById("fechaInicio").value = `${hoy}T${hh}:${mm}`;

        const fin = new Date(ahora.getTime() + 30 * 60 * 1000);
        const fhh = String(fin.getHours()).padStart(2, "0");
        const fmm = String(fin.getMinutes()).padStart(2, "0");
        const fdia = toISODate(fin);
        document.getElementById("fechaFin").value = `${fdia}T${fhh}:${fmm}`;

        modalCita.show();
    }

    /*
     * Abre el modal de nueva cita con fecha y hora prellenadas
     * según la celda del calendario donde se hizo clic.
     */
    function abrirNuevaDesdeCelda(hora, col) {
        formCita.reset();
        document.getElementById("citaId").value = "";
        document.getElementById("tituloModal").textContent = "Nueva cita";
        ocultarErroresForm(alertaForm);

        // Fecha del día correspondiente a la columna
        const dia = new Date(calendarState.fechaInicio);
        dia.setDate(dia.getDate() + col);

        // Inicio: la hora de la celda, en punto
        const fechaInicio = new Date(dia);
        fechaInicio.setHours(hora, 0, 0, 0);

        // Fin: 30 min después
        const fechaFin = new Date(fechaInicio.getTime() + 30 * 60 * 1000);

        // Formatear para datetime-local: YYYY-MM-DDTHH:mm
        document.getElementById("fechaInicio").value = formatearDateTimeLocal(fechaInicio);
        document.getElementById("fechaFin").value = formatearDateTimeLocal(fechaFin);

        modalCita.show();
    }

    async function abrirEditar(id) {
        try {
            const c = await Api.get("/citas/" + id);

            document.getElementById("tituloModal").textContent = "Editar cita";
            document.getElementById("citaId").value = c.id;
            document.getElementById("pacienteId").value = c.pacienteId;
            document.getElementById("odontologoId").value = c.odontologoId;
            document.getElementById("fechaInicio").value = c.fechaHoraInicio.substring(0, 16);
            document.getElementById("fechaFin").value = c.fechaHoraFin.substring(0, 16);
            document.getElementById("motivo").value = c.motivo ?? "";
            document.getElementById("observaciones").value = c.observaciones ?? "";

            ocultarErroresForm(alertaForm);
            modalCita.show();
        } catch (err) {
            if (err.status !== 401) Toast.error("No se pudo cargar la cita: " + err.message);
        }
    }

    formCita.addEventListener("submit", async (e) => {
        e.preventDefault();
        ocultarErroresForm(alertaForm);

        const id = document.getElementById("citaId").value;
        const esEdicion = !!id;

        const body = {
            pacienteId: parseInt(document.getElementById("pacienteId").value) || 0,
            odontologoId: parseInt(document.getElementById("odontologoId").value) || 0,
            fechaHoraInicio: document.getElementById("fechaInicio").value,
            fechaHoraFin: document.getElementById("fechaFin").value,
            motivo: document.getElementById("motivo").value.trim() || null,
            observaciones: document.getElementById("observaciones").value.trim() || null
        };

        if (!body.pacienteId || !body.odontologoId ||
            !body.fechaHoraInicio || !body.fechaHoraFin) {
            mostrarErroresForm(alertaForm,
                ["Paciente, odontólogo, fecha de inicio y fin son obligatorios."]);
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
                await Api.put("/citas/" + id, body);
                Toast.exito("Cita actualizada.");
            } else {
                await Api.post("/citas", body);
                Toast.exito("Cita creada.");
            }
            modalCita.hide();

            // Refrescar la vista activa
            if (vistaCalendario.style.display !== "none") {
                cargarCalendario();
            } else {
                cargarHoy();
                cargarLista();
            }
        } catch (err) {
            if (err.status === 401) return;
            mostrarErroresForm(alertaForm, extraerMensajesError(err));
        } finally {
            btn.disabled = false;
            spinner.classList.add("d-none");
            texto.textContent = "Guardar";
        }
    });

    async function abrirCambiarEstado(id) {
        try {
            const c = await Api.get("/citas/" + id);

            document.getElementById("citaIdEstado").value = c.id;
            document.getElementById("nuevoEstado").value = "";
            document.getElementById("observacionesEstado").value = "";
            ocultarErroresForm(alertaEstado);
            modalEstado.show();
        } catch (err) {
            if (err.status !== 401) Toast.error("No se pudo cargar la cita.");
        }
    }

    formEstado.addEventListener("submit", async (e) => {
        e.preventDefault();
        ocultarErroresForm(alertaEstado);

        const id = document.getElementById("citaIdEstado").value;
        const estadoId = parseInt(document.getElementById("nuevoEstado").value);

        if (!estadoId) {
            mostrarErroresForm(alertaEstado, ["Selecciona un estado."]);
            return;
        }

        const body = {
            estadoCitaId: estadoId,
            observaciones: document.getElementById("observacionesEstado").value.trim() || null
        };

        const btn = document.getElementById("btnCambiarEstado");
        const spinner = document.getElementById("spinnerEstado");
        const texto = document.getElementById("textoEstado");
        btn.disabled = true;
        spinner.classList.remove("d-none");
        texto.textContent = "Cambiando…";

        try {
            await Api.patch("/citas/" + id + "/estado", body);
            Toast.exito("Estado actualizado.");
            modalEstado.hide();

            if (vistaCalendario.style.display !== "none") {
                cargarCalendario();
            } else {
                cargarHoy();
                cargarLista();
            }
        } catch (err) {
            if (err.status === 401) return;
            mostrarErroresForm(alertaEstado, extraerMensajesError(err));
        } finally {
            btn.disabled = false;
            spinner.classList.add("d-none");
            texto.textContent = "Cambiar estado";
        }
    });

    // ════════════════════════════════════════════
    // Filtros (vista Lista)
    // ════════════════════════════════════════════

    document.getElementById("btnBuscar").addEventListener("click", () => {
        estado.pagina = 1;
        estado.filtros.desde = document.getElementById("filtroDesde").value;
        estado.filtros.hasta = document.getElementById("filtroHasta").value;
        estado.filtros.busqueda = document.getElementById("filtroBusqueda").value.trim();
        estado.filtros.estadoCitaId = document.getElementById("filtroEstado").value;
        cargarLista();
    });

    document.getElementById("btnLimpiar").addEventListener("click", () => {
        document.getElementById("filtroDesde").value = hoyISO;
        document.getElementById("filtroHasta").value = en30Dias;
        document.getElementById("filtroBusqueda").value = "";
        document.getElementById("filtroEstado").value = "";
        estado.pagina = 1;
        estado.filtros = { desde: hoyISO, hasta: en30Dias, busqueda: "", estadoCitaId: "" };
        cargarLista();
    });

    document.getElementById("filtroBusqueda").addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            document.getElementById("btnBuscar").click();
        }
    });

    // ════════════════════════════════════════════
    // Helpers
    // ════════════════════════════════════════════

    function esc(texto) {
        if (texto === null || texto === undefined) return "";
        const div = document.createElement("div");
        div.textContent = String(texto);
        return div.innerHTML;
    }

    function colorEstado(nombre) {
        return {
            "Programada": "primary",
            "Confirmada": "info",
            "Atendida": "success",
            "Cancelada": "secondary",
            "NoAsistio": "warning"
        }[nombre] || "secondary";
    }

    function claseEstadoCita(nombre) {
        return {
            "Programada": "estado-programada",
            "Confirmada": "estado-confirmada",
            "Atendida": "estado-atendida",
            "Cancelada": "estado-cancelada",
            "NoAsistio": "estado-noasistio"
        }[nombre] || "estado-programada";
    }

    function mostrarErroresForm(contenedor, mensajes) {
        contenedor.innerHTML = "<ul class='mb-0'>" +
            mensajes.map(m => `<li>${esc(m)}</li>`).join("") + "</ul>";
        contenedor.classList.remove("d-none");
    }

    function ocultarErroresForm(contenedor) {
        contenedor.classList.add("d-none");
        contenedor.innerHTML = "";
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

    /**
     * Devuelve el lunes de la semana de la fecha dada.
     * (lunes como inicio de semana)
     */
    function primerDiaDeSemana(fecha) {
        const d = new Date(fecha);
        d.setHours(0, 0, 0, 0);
        const dia = d.getDay(); // 0=domingo
        const diff = dia === 0 ? -6 : 1 - dia;
        d.setDate(d.getDate() + diff);
        return d;
    }

    /**
     * Devuelve true si la fecha dada está en la misma semana que hoy.
     */
    function esSemanaActual(lunes) {
        const lunesHoy = primerDiaDeSemana(new Date());
        return lunes.getTime() === lunesHoy.getTime();
    }

    /**
     * Formatea una fecha como YYYY-MM-DD en hora local.
     * Evita usar toISOString() porque puede cambiar el día por la zona horaria.
     */
    function toISODate(fecha) {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, "0");
        const d = String(fecha.getDate()).padStart(2, "0");
        return `${y}-${m}-${d}`;
    }

    /**
     * Convierte una fecha a string en formato datetime-local (YYYY-MM-DDTHH:mm).
     * Importante: usa la hora local, no UTC.
     */
    function formatearDateTimeLocal(fecha) {
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, "0");
        const d = String(fecha.getDate()).padStart(2, "0");
        const hh = String(fecha.getHours()).padStart(2, "0");
        const mm = String(fecha.getMinutes()).padStart(2, "0");
        return `${y}-${m}-${d}T${hh}:${mm}`;
    }

    // ════════════════════════════════════════════
    // Arranque
    // ════════════════════════════════════════════

    (async () => {
        await cargarCatalogos();

        // Vista guardada por el usuario, por defecto Calendario
        const vistaGuardada = localStorage.getItem("agenda_vista") || "calendario";
        aplicarVista(vistaGuardada);
    })();
};