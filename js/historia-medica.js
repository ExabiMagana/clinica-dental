window.onLayoutReady = function () {

    // Obtener pacienteId de la URL
    const params = new URLSearchParams(window.location.search);
    const pacienteId = parseInt(params.get("pacienteId"));

    if (!pacienteId || pacienteId <= 0) {
        document.getElementById("alertaError").textContent =
            "No se especificó un paciente válido.";
        document.getElementById("alertaError").classList.remove("d-none");
        return;
    }

    const contenedorPreguntas = document.getElementById("contenedorPreguntas");
    const txtObservaciones = document.getElementById("observacionesGenerales");
    const alertaError = document.getElementById("alertaError");
    const btnGuardar = document.getElementById("btnGuardar");
    const spinner = document.getElementById("spinnerGuardar");
    const iconoGuardar = document.getElementById("iconoGuardar");
    const textoGuardar = document.getElementById("textoGuardar");
    const infoGuardado = document.getElementById("infoGuardado");

    // Guardamos el catálogo original por id para saber el tipo al enviar
    let preguntasPorId = {};

    // Cargar historia médica
    async function cargar() {
        contenedorPreguntas.innerHTML = `
            <div class="text-center text-muted py-4">
                <div class="spinner-border spinner-border-sm me-2"></div>
                Cargando historia médica…
            </div>`;

        try {
            const historia = await Api.get("/historia-medica/" + pacienteId);

            document.getElementById("tituloPaciente").textContent =
                "Historia Médica — " + historia.pacienteNombre;
            document.getElementById("subtituloPaciente").textContent =
                "Última actualización: " + formatearFecha(historia.fechaActualizacion);

            txtObservaciones.value = historia.observacionesGenerales ?? "";

            renderPreguntas(historia.respuestas);
        } catch (err) {
            if (err.status === 401) return;
            if (err.status === 404) {
                alertaError.textContent = "Paciente no encontrado.";
                alertaError.classList.remove("d-none");
                contenedorPreguntas.innerHTML = "";
                return;
            }
            alertaError.textContent = "No se pudo cargar la historia médica: " + err.message;
            alertaError.classList.remove("d-none");
            contenedorPreguntas.innerHTML = "";
        }
    }

    // Renderizar preguntas agrupadas por categoría
    function renderPreguntas(respuestas) {
        if (!respuestas || respuestas.length === 0) {
            contenedorPreguntas.innerHTML =
                `<div class="alert alert-info">No hay preguntas configuradas.</div>`;
            return;
        }

        // Guardar catálogo indexado
        preguntasPorId = {};
        respuestas.forEach(r => {
            preguntasPorId[r.preguntaId] = r;
        });

        // Agrupar por categoría respetando el orden original
        const grupos = {};
        const ordenCategorias = [];
        respuestas.forEach(r => {
            if (!grupos[r.categoria]) {
                grupos[r.categoria] = [];
                ordenCategorias.push(r.categoria);
            }
            grupos[r.categoria].push(r);
        });

        // Construir HTML
        let html = "";

        ordenCategorias.forEach(categoria => {
            html += `
                <div class="card border-0 shadow-sm mb-3">
                    <div class="card-header bg-white">
                        <strong>${esc(categoria)}</strong>
                    </div>
                    <div class="card-body">
            `;

            grupos[categoria].forEach(p => {
                html += renderPregunta(p);
            });

            html += `
                    </div>
                </div>
            `;
        });

        contenedorPreguntas.innerHTML = html;
    }

    function renderPregunta(p) {
        const valorActual = p.valor ?? "";
        const inputId = "pregunta_" + p.preguntaId;

        let inputHTML = "";

        if (p.tipoRespuesta === "SiNo") {
            const marcadoSi = valorActual === "Si" ? "checked" : "";
            const marcadoNo = valorActual === "No" ? "checked" : "";
            const marcadoVacio = !valorActual ? "checked" : "";

            inputHTML = `
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio"
                           name="${inputId}" id="${inputId}_si" value="Si" ${marcadoSi}>
                    <label class="form-check-label" for="${inputId}_si">Sí</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio"
                           name="${inputId}" id="${inputId}_no" value="No" ${marcadoNo}>
                    <label class="form-check-label" for="${inputId}_no">No</label>
                </div>
                <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio"
                           name="${inputId}" id="${inputId}_vacio" value="" ${marcadoVacio}>
                    <label class="form-check-label text-muted" for="${inputId}_vacio">Sin responder</label>
                </div>
            `;
        } else if (p.tipoRespuesta === "Numero") {
            inputHTML = `
                <input type="number" class="form-control form-control-sm"
                       id="${inputId}" data-pregunta="${p.preguntaId}"
                       value="${esc(valorActual)}" placeholder="Número">
            `;
        } else {
            inputHTML = `
                <input type="text" class="form-control form-control-sm"
                       id="${inputId}" data-pregunta="${p.preguntaId}"
                       value="${esc(valorActual)}" maxlength="500" placeholder="Escriba aquí">
            `;
        }

        // Para los SiNo usamos data-pregunta en cada radio del grupo
        if (p.tipoRespuesta === "SiNo") {
            // Inyectamos el atributo data-pregunta en el HTML generado arriba
            inputHTML = inputHTML.replace(/type="radio"/g,
                `type="radio" data-pregunta="${p.preguntaId}"`);
        }

        const tieneRespuesta = p.valor !== null && p.valor !== undefined && p.valor !== "";
        const peque = tieneRespuesta && p.fechaRegistro
            ? `<small class="text-muted ms-2">(actualizado ${formatearFechaCorta(p.fechaRegistro)})</small>`
            : "";

        return `
            <div class="mb-3 pb-3 border-bottom">
                <label class="form-label mb-1">
                    ${esc(p.pregunta)}${peque}
                </label>
                <div>${inputHTML}</div>
            </div>
        `;
    }

    // Guardar
    btnGuardar.addEventListener("click", async () => {
        alertaError.classList.add("d-none");

        const respuestas = [];

        Object.values(preguntasPorId).forEach(p => {
            const inputId = "pregunta_" + p.preguntaId;
            let valor = null;

            if (p.tipoRespuesta === "SiNo") {
                const seleccionado = document.querySelector(
                    `input[name="${inputId}"]:checked`);
                valor = seleccionado && seleccionado.value !== ""
                    ? seleccionado.value
                    : null;
            } else {
                const input = document.getElementById(inputId);
                const raw = input ? input.value.trim() : "";
                valor = raw === "" ? null : raw;
            }

            respuestas.push({ preguntaId: p.preguntaId, valor });
        });

        const body = {
            observacionesGenerales: txtObservaciones.value.trim() || null,
            respuestas
        };

        // UI: bloqueado
        btnGuardar.disabled = true;
        spinner.classList.remove("d-none");
        iconoGuardar.classList.add("d-none");
        textoGuardar.textContent = "Guardando…";

        try {
            const guardado = await Api.put("/historia-medica/" + pacienteId, body);

            // Actualizar catálogo local por si cambió algo
            preguntasPorId = {};
            guardado.respuestas.forEach(r => {
                preguntasPorId[r.preguntaId] = r;
            });

            infoGuardado.textContent =
                "Última actualización: " + formatearFecha(guardado.fechaActualizacion);
            document.getElementById("subtituloPaciente").textContent =
                "Última actualización: " + formatearFecha(guardado.fechaActualizacion);

            Toast.exito("Historia médica guardada.");
        } catch (err) {
            if (err.status === 401) return;

            if (err.status === 403) {
                alertaError.textContent =
                    "Tu rol no permite editar la historia médica.";
            } else if (err.data && err.data.errores) {
                const mensajes = [];
                for (const campo in err.data.errores) {
                    err.data.errores[campo].forEach(m => mensajes.push(m));
                }
                alertaError.innerHTML = "<ul class='mb-0'>" +
                    mensajes.map(m => `<li>${esc(m)}</li>`).join("") + "</ul>";
            } else {
                alertaError.textContent = err.message || "Error al guardar.";
            }
            alertaError.classList.remove("d-none");
            window.scrollTo({ top: 0, behavior: "smooth" });
        } finally {
            btnGuardar.disabled = false;
            spinner.classList.add("d-none");
            iconoGuardar.classList.remove("d-none");
            textoGuardar.textContent = "Guardar cambios";
        }
    });

    // Helpers
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

    function formatearFechaCorta(iso) {
        if (!iso) return "";
        const d = new Date(iso);
        return d.toLocaleDateString("es-SV");
    }

    // Arranque
    infoGuardado.textContent = "Sin cambios pendientes.";
    cargar();
};