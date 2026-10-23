"use strict";

const API = "/api/admin";

const ESTADOS = {
    CREADO: { texto: "Creado", clase: "creado" },
    RECOGIDO: { texto: "Recogido", clase: "logistica" },
    EN_CENTRO_LOGISTICO: { texto: "En centro logístico", clase: "logistica" },
    EN_TRANSITO: { texto: "En tránsito", clase: "logistica" },
    EN_CIUDAD_DESTINO: { texto: "En ciudad destino", clase: "pendiente" },
    EN_REPARTO: { texto: "En reparto", clase: "en-ruta" },
    ENTREGADO: { texto: "Entregado", clase: "completado" },
    NOVEDAD: { texto: "Novedad", clase: "novedad" },
    CANCELADO: { texto: "Cancelado", clase: "cancelado" }
};

const ESTADOS_FINALES = ["ENTREGADO", "CANCELADO"];

const TITULOS_SECCION = {
    inicio: "Inicio",
    pedidos: "Pedidos",
    domiciliarios: "Domiciliarios",
    novedades: "Novedades",
    perfil: "Mi perfil"
};

const ESCAPES_HTML = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
};

const CAMPOS_OBLIGATORIOS = [
    "fRemitente",
    "fDestinatario",
    "fTelefono",
    "fDireccion",
    "fCiudad",
    "fContenido"
];

const datos = {
    perfil: null,
    pedidos: [],
    domiciliarios: [],
    ocupado: false,
    pedidoEditando: null,
    pedidoAccion: null,
    temporizadorToast: null
};

const el = (id) => document.getElementById(id);

function leerSesion(clave) {
    return localStorage.getItem(clave) || sessionStorage.getItem(clave);
}

function limpiarSesion() {
    ["token", "usuario", "nombre", "rol"].forEach((clave) => {
        localStorage.removeItem(clave);
        sessionStorage.removeItem(clave);
    });
}

function irALogin() {
    limpiarSesion();
    window.location.replace("login.html");
}

function escapar(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (c) => ESCAPES_HTML[c]);
}

function iniciales(nombre) {
    const partes = String(nombre || "").trim().split(/\s+/).filter(Boolean);

    if (partes.length === 0) {
        return "A";
    }

    const primera = partes[0][0];
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : "";

    return (primera + ultima).toUpperCase();
}

function formatearTiempo(minutos) {
    if (minutos < 60) {
        return `${minutos} min`;
    }

    const horas = Math.floor(minutos / 60);
    const resto = minutos % 60;

    return resto ? `${horas} h ${resto} min` : `${horas} h`;
}

function formatearFecha(iso) {
    if (!iso) {
        return "—";
    }

    return new Date(iso).toLocaleString("es-CO", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit"
    });
}

async function api(ruta, opciones = {}) {
    let respuesta;

    try {
        respuesta = await fetch(API + ruta, {
            ...opciones,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${leerSesion("token")}`
            }
        });
    } catch (error) {
        throw new Error("No hay conexión con el servidor");
    }

    if (respuesta.status === 401 || respuesta.status === 403) {
        irALogin();
        throw new Error("Sesión expirada");
    }

    if (!respuesta.ok) {
        let mensaje = "Ocurrió un error inesperado";

        try {
            const cuerpo = await respuesta.json();

            if (cuerpo.message) {
                mensaje = cuerpo.message;
            }
        } catch (error) {
            mensaje = "Ocurrió un error inesperado";
        }

        throw new Error(mensaje);
    }

    if (respuesta.status === 204) {
        return null;
    }

    return respuesta.json();
}

function esFinal(pedido) {
    return ESTADOS_FINALES.includes(pedido.estado);
}

function esAsignable(pedido) {
    return !esFinal(pedido) && pedido.estado !== "EN_REPARTO";
}

function sinDomiciliario(pedido) {
    return !pedido.domiciliario;
}

function buscarPedido(id) {
    return datos.pedidos.find((pedido) => pedido.id === id);
}

function nombreDomiciliario(usuario) {
    const encontrado = datos.domiciliarios.find((d) => d.usuario === usuario);

    return encontrado ? encontrado.nombre : usuario;
}

function badgeEstado(estado) {
    const info = ESTADOS[estado] || { texto: estado, clase: "creado" };

    return `<span class="badge-estado ${info.clase}">${info.texto}</span>`;
}

function badgePrioridad(prioridad) {
    const clase = prioridad === "Alta" ? "prioridad-alta" : "prioridad-normal";

    return `<span class="badge-prioridad ${clase}">${escapar(prioridad || "Normal")}</span>`;
}

function celdaDomiciliario(pedido) {
    if (sinDomiciliario(pedido)) {
        return `<span class="sin-asignar">Sin asignar</span>`;
    }

    return `<div class="celda-doble"><strong>${escapar(nombreDomiciliario(pedido.domiciliario))}</strong><span>@${escapar(pedido.domiciliario)}</span></div>`;
}

function boton(accion, texto, id, clase) {
    return `<button type="button" class="boton-mini ${clase}" data-accion="${accion}" data-id="${escapar(id)}">${texto}</button>`;
}

function mostrarToast(titulo, mensaje, tipo = "ok") {
    const toast = el("toast");

    el("toastTitulo").textContent = titulo;
    el("toastMensaje").textContent = mensaje;

    toast.classList.toggle("error", tipo === "error");
    toast.classList.add("visible");

    clearTimeout(datos.temporizadorToast);

    datos.temporizadorToast = setTimeout(() => {
        toast.classList.remove("visible");
    }, 4000);
}

function mostrarSeccion(nombre) {
    const objetivo = el(`seccion-${nombre}`);

    if (!objetivo) {
        return;
    }

    document.querySelectorAll(".seccion").forEach((seccion) => {
        seccion.classList.remove("activa");
    });

    document.querySelectorAll(".item-menu").forEach((item) => {
        item.classList.toggle("activo", item.dataset.seccion === nombre);
    });

    objetivo.classList.add("activa");

    el("tituloSeccion").textContent = TITULOS_SECCION[nombre] || "Inicio";

    cerrarMenu();

    window.scrollTo({ top: 0, behavior: "smooth" });
}

function abrirMenu() {
    el("barraLateral").classList.add("expandida");
    el("overlayMenu").classList.add("activo");
}

function cerrarMenu() {
    el("barraLateral").classList.remove("expandida");
    el("overlayMenu").classList.remove("activo");
}

function renderPerfil() {
    const perfil = datos.perfil;

    if (!perfil) {
        return;
    }

    const nombre = perfil.nombre || perfil.usuario;
    const sigla = iniciales(nombre);

    ["nombreSidebar", "nombreSuperior", "nombrePerfil", "datoNombre"].forEach((id) => {
        el(id).textContent = nombre;
    });

    el("nombreBienvenida").textContent = nombre.trim().split(/\s+/)[0];
    el("datoUsuario").textContent = perfil.usuario;
    el("datoCorreo").textContent = perfil.correo;
    el("datoRol").textContent = perfil.rol;

    ["avatarSidebar", "avatarSuperior", "avatarPerfil"].forEach((id) => {
        el(id).textContent = sigla;
    });
}

function actualizarContador(id, cantidad) {
    const contador = el(id);

    contador.textContent = cantidad;
    contador.hidden = cantidad === 0;
}

function renderEstadisticas() {
    const total = datos.pedidos.length;
    const entregados = datos.pedidos.filter((p) => p.estado === "ENTREGADO").length;
    const novedades = datos.pedidos.filter((p) => p.estado === "NOVEDAD").length;
    const proceso = datos.pedidos.filter((p) => !esFinal(p)).length;
    const porAsignar = datos.pedidos.filter((p) => !esFinal(p) && sinDomiciliario(p)).length;

    el("statTotal").textContent = total;
    el("statProceso").textContent = proceso;
    el("statEntregados").textContent = entregados;
    el("statNovedades").textContent = novedades;

    el("statSinAsignar").textContent = total === 0
        ? "Sin información"
        : porAsignar > 0
            ? `${porAsignar} sin asignar`
            : "Todos asignados";

    actualizarContador("contadorPedidosMenu", proceso);
    actualizarContador("contadorNovedadesMenu", novedades);
}

function renderRecientes() {
    const contenedor = el("listaRecientes");
    const recientes = datos.pedidos.slice(0, 5);

    if (recientes.length === 0) {
        contenedor.innerHTML = `<p class="vacio-lista">Todavía no hay pedidos. Crea el primero.</p>`;
        return;
    }

    contenedor.innerHTML = recientes.map((pedido) => `
        <div class="fila-reciente" data-accion="ver" data-id="${escapar(pedido.id)}">
            <div>
                <strong>#${escapar(pedido.guia)} · ${escapar(pedido.nombreDestinatario)}</strong>
                <span>${escapar(pedido.direccionDestino)}</span>
            </div>
            ${badgeEstado(pedido.estado)}
        </div>
    `).join("");
}

function renderSinAsignar() {
    const contenedor = el("listaSinAsignar");

    const pendientes = datos.pedidos
        .filter((p) => !esFinal(p) && sinDomiciliario(p))
        .slice(0, 5);

    if (pendientes.length === 0) {
        contenedor.innerHTML = `<p class="vacio-lista">No hay pedidos pendientes de asignar.</p>`;
        return;
    }

    contenedor.innerHTML = pendientes.map((pedido) => `
        <div class="fila-reciente">
            <div>
                <strong>#${escapar(pedido.guia)} · ${escapar(pedido.nombreDestinatario)}</strong>
                <span>${escapar(pedido.direccionDestino)}</span>
            </div>
            ${boton("asignar", "Asignar", pedido.id, "boton-accion")}
        </div>
    `).join("");
}

function pedidosFiltrados() {
    const texto = el("buscarPedido").value.trim().toLowerCase();
    const estado = el("filtroEstado").value;
    const asignacion = el("filtroAsignacion").value;

    return datos.pedidos.filter((pedido) => {
        if (estado !== "todos" && pedido.estado !== estado) {
            return false;
        }

        if (asignacion === "sin" && !sinDomiciliario(pedido)) {
            return false;
        }

        if (asignacion === "con" && sinDomiciliario(pedido)) {
            return false;
        }

        if (!texto) {
            return true;
        }

        return [
            pedido.guia,
            pedido.nombreDestinatario,
            pedido.direccionDestino,
            pedido.ciudadDestino,
            pedido.domiciliario
        ].some((valor) => String(valor || "").toLowerCase().includes(texto));
    });
}

function tablaVacia(icono, titulo, mensaje) {
    return `
        <div class="tabla-vacia">
            <span>${icono}</span>
            <strong>${titulo}</strong>
            <p>${mensaje}</p>
        </div>
    `;
}

function renderTablaPedidos() {
    const contenedor = el("tablaPedidos");
    const filtrados = pedidosFiltrados();

    if (filtrados.length === 0) {
        contenedor.classList.remove("con-datos");

        contenedor.innerHTML = datos.pedidos.length === 0
            ? tablaVacia("📦", "No hay pedidos registrados", "Crea un pedido con el botón \"Crear pedido\".")
            : tablaVacia("🔍", "Sin resultados", "Ningún pedido coincide con los filtros aplicados.");

        return;
    }

    contenedor.classList.add("con-datos");

    contenedor.innerHTML = `
        <div class="tabla-scroll">
            <table class="tabla-historial">
                <thead>
                    <tr>
                        <th>Guía</th>
                        <th>Destinatario</th>
                        <th>Dirección</th>
                        <th>Prioridad</th>
                        <th>Estado</th>
                        <th>Domiciliario</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${filtrados.map((pedido) => `
                        <tr>
                            <td><strong>#${escapar(pedido.guia)}</strong></td>
                            <td>${escapar(pedido.nombreDestinatario)}</td>
                            <td>
                                <div class="celda-doble">
                                    <strong>${escapar(pedido.direccionDestino)}</strong>
                                    <span>${escapar(pedido.ciudadDestino)}</span>
                                </div>
                            </td>
                            <td>${badgePrioridad(pedido.prioridad)}</td>
                            <td>${badgeEstado(pedido.estado)}</td>
                            <td>${celdaDomiciliario(pedido)}</td>
                            <td class="celda-acciones">
                                <div class="acciones-fila">
                                    ${boton("ver", "Ver", pedido.id, "boton-neutro")}
                                    ${esAsignable(pedido) ? boton("asignar", "Asignar", pedido.id, "boton-accion") : ""}
                                    ${esFinal(pedido) ? "" : boton("editar", "Editar", pedido.id, "boton-neutro")}
                                    ${boton("eliminar", "Eliminar", pedido.id, "boton-borrar")}
                                </div>
                            </td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderDomiciliarios() {
    const contenedor = el("tablaDomiciliarios");

    if (datos.domiciliarios.length === 0) {
        contenedor.classList.remove("con-datos");

        contenedor.innerHTML = tablaVacia(
            "🛵",
            "No hay domiciliarios registrados",
            "Los domiciliarios aparecen aquí cuando se registran con ese rol."
        );

        return;
    }

    const claseEstado = {
        "Disponible": "completado",
        "En ruta": "en-ruta",
        "No disponible": "cancelado"
    };

    contenedor.classList.add("con-datos");

    contenedor.innerHTML = `
        <div class="tabla-scroll">
            <table class="tabla-historial">
                <thead>
                    <tr>
                        <th>Domiciliario</th>
                        <th>Correo</th>
                        <th>Estado de trabajo</th>
                        <th>Pedidos activos</th>
                        <th>Entregados</th>
                        <th>Cuenta</th>
                    </tr>
                </thead>
                <tbody>
                    ${datos.domiciliarios.map((d) => `
                        <tr>
                            <td>
                                <div class="celda-doble">
                                    <strong>${escapar(d.nombre)}</strong>
                                    <span>@${escapar(d.usuario)}</span>
                                </div>
                            </td>
                            <td>${escapar(d.correo)}</td>
                            <td><span class="badge-estado ${claseEstado[d.estadoTrabajo] || "creado"}">${escapar(d.estadoTrabajo)}</span></td>
                            <td>${d.pedidosActivos}</td>
                            <td>${d.pedidosEntregados}</td>
                            <td><span class="badge-estado ${d.activo ? "completado" : "cancelado"}">${d.activo ? "Activa" : "Inactiva"}</span></td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderNovedades() {
    const contenedor = el("listaNovedades");
    const novedades = datos.pedidos.filter((p) => p.estado === "NOVEDAD");

    if (novedades.length === 0) {
        contenedor.innerHTML = `<p class="vacio-lista">No hay novedades pendientes. Todo marcha bien.</p>`;
        return;
    }

    contenedor.innerHTML = novedades.map((pedido) => `
        <div class="novedad-item">
            <div class="novedad-icono">⚠️</div>

            <div class="novedad-info">
                <strong>#${escapar(pedido.guia)} · ${escapar(pedido.nombreDestinatario)}</strong>
                <span>${escapar(pedido.direccionDestino)} · ${escapar(pedido.ciudadDestino)}</span>
                <span>Domiciliario: ${escapar(nombreDomiciliario(pedido.domiciliario) || "Sin asignar")} · ${formatearFecha(pedido.fechaActualizacion)}</span>

                <div class="novedad-motivo">${escapar(pedido.observacion || "Sin motivo registrado")}</div>

                <div class="novedad-acciones">
                    ${boton("asignar", "Reasignar", pedido.id, "boton-accion")}
                    ${boton("ver", "Ver detalle", pedido.id, "boton-neutro")}
                    ${boton("cancelar", "Cancelar pedido", pedido.id, "boton-borrar")}
                </div>
            </div>
        </div>
    `).join("");
}

function renderTodo() {
    renderEstadisticas();
    renderRecientes();
    renderSinAsignar();
    renderTablaPedidos();
    renderDomiciliarios();
    renderNovedades();
}

function llenarFiltroEstados() {
    const opciones = Object.entries(ESTADOS)
        .map(([clave, info]) => `<option value="${clave}">${info.texto}</option>`)
        .join("");

    el("filtroEstado").innerHTML = `<option value="todos">Todos los estados</option>${opciones}`;
}

function opcionesDomiciliarios(seleccionado, conVacio) {
    const activos = datos.domiciliarios.filter((d) => d.activo);

    const vacia = conVacio ? `<option value="">Sin asignar</option>` : "";

    if (activos.length === 0) {
        return `${vacia}<option value="" disabled ${conVacio ? "" : "selected"}>No hay domiciliarios disponibles</option>`;
    }

    return vacia + activos.map((d) => {
        const marcado = d.usuario === seleccionado ? "selected" : "";

        return `<option value="${escapar(d.usuario)}" ${marcado}>${escapar(d.nombre)} (@${escapar(d.usuario)}) · ${d.pedidosActivos} activos · ${escapar(d.estadoTrabajo)}</option>`;
    }).join("");
}

async function cargarDatos() {
    const [pedidos, domiciliarios] = await Promise.all([
        api("/pedidos"),
        api("/domiciliarios")
    ]);

    datos.pedidos = pedidos;
    datos.domiciliarios = domiciliarios;

    renderTodo();
}

async function refrescarSilencioso() {
    if (datos.ocupado || document.querySelector(".modal-fondo:not([hidden])")) {
        return;
    }

    try {
        await cargarDatos();
    } catch (error) {
        return;
    }
}

function cerrarModales() {
    document.querySelectorAll(".modal-fondo").forEach((modal) => {
        modal.hidden = true;
    });

    datos.pedidoEditando = null;
    datos.pedidoAccion = null;

    document.body.classList.remove("modal-abierto");
}

function abrirModal(id) {
    cerrarModales();

    el(id).hidden = false;

    document.body.classList.add("modal-abierto");
}

function mostrarError(idElemento, mensaje) {
    const error = el(idElemento);

    error.textContent = mensaje;
    error.hidden = !mensaje;
}

function abrirFormulario(pedido) {
    const editando = Boolean(pedido);

    el("modalPedidoEtiqueta").textContent = editando ? "EDITAR PEDIDO" : "NUEVO PEDIDO";
    el("modalPedidoTitulo").textContent = editando ? `Editar #${pedido.guia}` : "Crear pedido";
    el("botonGuardarPedido").textContent = editando ? "Guardar cambios" : "Guardar pedido";

    el("fRemitente").value = pedido ? pedido.nombreRemitente || "" : "";
    el("fDestinatario").value = pedido ? pedido.nombreDestinatario || "" : "";
    el("fTelefono").value = pedido ? pedido.telefonoDestinatario || "" : "";
    el("fPrioridad").value = pedido ? pedido.prioridad || "Normal" : "Normal";
    el("fDireccion").value = pedido ? pedido.direccionDestino || "" : "";
    el("fCiudad").value = pedido ? pedido.ciudadDestino || "" : "";
    el("fContenido").value = pedido ? pedido.descripcion || "" : "";
    el("fDistancia").value = pedido ? pedido.distanciaKm : 0;
    el("fTiempo").value = pedido ? pedido.tiempoEstimadoMin : 0;

    el("campoDomiciliario").hidden = editando;
    el("fDomiciliario").innerHTML = opcionesDomiciliarios("", true);

    CAMPOS_OBLIGATORIOS.forEach((id) => el(id).classList.remove("invalido"));

    mostrarError("errorFormulario", "");

    abrirModal("modalPedido");

    datos.pedidoEditando = pedido ? pedido.id : null;

    el("fRemitente").focus();
}

function datosFormulario() {
    return {
        nombreRemitente: el("fRemitente").value.trim(),
        nombreDestinatario: el("fDestinatario").value.trim(),
        telefonoDestinatario: el("fTelefono").value.trim(),
        direccionDestino: el("fDireccion").value.trim(),
        ciudadDestino: el("fCiudad").value.trim(),
        descripcion: el("fContenido").value.trim(),
        prioridad: el("fPrioridad").value,
        distanciaKm: parseFloat(el("fDistancia").value) || 0,
        tiempoEstimadoMin: parseInt(el("fTiempo").value, 10) || 0,
        domiciliario: el("campoDomiciliario").hidden ? "" : el("fDomiciliario").value
    };
}

async function guardarPedido(evento) {
    evento.preventDefault();

    let faltantes = 0;

    CAMPOS_OBLIGATORIOS.forEach((id) => {
        const vacio = el(id).value.trim() === "";

        el(id).classList.toggle("invalido", vacio);

        if (vacio) {
            faltantes += 1;
        }
    });

    if (faltantes > 0) {
        mostrarError("errorFormulario", "Completa los campos obligatorios marcados en rojo.");
        return;
    }

    if (datos.ocupado) {
        return;
    }

    datos.ocupado = true;

    const boton = el("botonGuardarPedido");

    boton.disabled = true;

    try {
        const editando = datos.pedidoEditando;

        const guardado = await api(
            editando ? `/pedidos/${encodeURIComponent(editando)}` : "/pedidos",
            {
                method: editando ? "PUT" : "POST",
                body: JSON.stringify(datosFormulario())
            }
        );

        cerrarModales();

        await cargarDatos();

        mostrarToast(
            editando ? "Pedido actualizado" : "Pedido creado",
            `#${guardado.guia} · ${guardado.nombreDestinatario}`
        );
    } catch (error) {
        mostrarError("errorFormulario", error.message);
    } finally {
        datos.ocupado = false;
        boton.disabled = false;
    }
}

function fila(etiqueta, valor) {
    return `<div class="detalle-fila"><span>${etiqueta}</span><strong>${valor}</strong></div>`;
}

function abrirDetalle(id) {
    const pedido = buscarPedido(id);

    if (!pedido) {
        return;
    }

    el("modalDetalleTitulo").textContent = `Pedido #${pedido.guia}`;

    const telefono = pedido.telefonoDestinatario
        ? `<a href="tel:${escapar(pedido.telefonoDestinatario)}">${escapar(pedido.telefonoDestinatario)}</a>`
        : "Sin teléfono";

    const domiciliario = sinDomiciliario(pedido)
        ? `<span class="sin-asignar">Sin asignar</span>`
        : `${escapar(nombreDomiciliario(pedido.domiciliario))} (@${escapar(pedido.domiciliario)})`;

    el("modalDetalleCuerpo").innerHTML = `
        ${fila("Estado", badgeEstado(pedido.estado))}
        ${fila("Prioridad", badgePrioridad(pedido.prioridad))}
        ${fila("Domiciliario", domiciliario)}
        ${fila("Destinatario", escapar(pedido.nombreDestinatario))}
        ${fila("Teléfono", telefono)}
        ${fila("Dirección", escapar(pedido.direccionDestino))}
        ${fila("Ciudad", escapar(pedido.ciudadDestino))}
        ${fila("Remitente", escapar(pedido.nombreRemitente))}
        ${fila("Contenido", escapar(pedido.descripcion))}
        ${fila("Distancia", `${Number(pedido.distanciaKm).toFixed(1)} km`)}
        ${fila("Tiempo estimado", formatearTiempo(pedido.tiempoEstimadoMin))}
        ${fila("Creado", formatearFecha(pedido.fechaCreacion))}
        ${fila("Actualizado", formatearFecha(pedido.fechaActualizacion))}
        ${pedido.fechaEntrega ? fila("Entregado", formatearFecha(pedido.fechaEntrega)) : ""}
        ${pedido.observacion ? fila("Observación", escapar(pedido.observacion)) : ""}
    `;

    el("modalDetalleAcciones").innerHTML = `
        ${boton("eliminar", "Eliminar", pedido.id, "boton-borrar")}
        ${esFinal(pedido) ? "" : boton("estado", "Cambiar estado", pedido.id, "boton-neutro")}
        ${esFinal(pedido) ? "" : boton("editar", "Editar", pedido.id, "boton-neutro")}
        ${esAsignable(pedido) ? boton("asignar", sinDomiciliario(pedido) ? "Asignar" : "Reasignar", pedido.id, "boton-accion") : ""}
    `;

    abrirModal("modalDetalle");
}

function abrirAsignar(id) {
    const pedido = buscarPedido(id);

    if (!pedido) {
        return;
    }

    el("modalAsignarTitulo").textContent = `Asignar #${pedido.guia}`;
    el("selectAsignar").innerHTML = opcionesDomiciliarios(pedido.domiciliario, false);

    abrirModal("modalAsignar");

    datos.pedidoAccion = id;
}

async function guardarAsignacion(evento) {
    evento.preventDefault();

    const id = datos.pedidoAccion;
    const usuario = el("selectAsignar").value;

    if (!usuario) {
        mostrarToast("Falta información", "No hay un domiciliario seleccionado.", "error");
        return;
    }

    await ejecutar(async () => {
        const actualizado = await api(
            `/pedidos/${encodeURIComponent(id)}/asignar`,
            {
                method: "PATCH",
                body: JSON.stringify({ domiciliario: usuario })
            }
        );

        cerrarModales();

        await cargarDatos();

        mostrarToast(
            "Pedido asignado",
            `#${actualizado.guia} → ${nombreDomiciliario(actualizado.domiciliario)}`
        );
    });
}

function alternarObservacion() {
    const esNovedad = el("selectEstado").value === "NOVEDAD";

    el("obsOpcional").textContent = esNovedad ? "(obligatoria)" : "(opcional)";
}

function abrirEstado(id) {
    const pedido = buscarPedido(id);

    if (!pedido) {
        return;
    }

    el("modalEstadoTitulo").textContent = `Estado de #${pedido.guia}`;

    el("selectEstado").innerHTML = Object.entries(ESTADOS)
        .filter(([clave]) => clave !== pedido.estado)
        .map(([clave, info]) => `<option value="${clave}">${info.texto}</option>`)
        .join("");

    el("textoObservacion").value = "";

    mostrarError("errorEstado", "");

    alternarObservacion();

    abrirModal("modalEstado");

    datos.pedidoAccion = id;
}

async function guardarEstado(evento) {
    evento.preventDefault();

    const id = datos.pedidoAccion;
    const estado = el("selectEstado").value;
    const observacion = el("textoObservacion").value.trim();

    if (estado === "NOVEDAD" && !observacion) {
        mostrarError("errorEstado", "Describe la novedad del pedido.");
        return;
    }

    await ejecutar(async () => {
        try {
            const actualizado = await api(
                `/pedidos/${encodeURIComponent(id)}/estado`,
                {
                    method: "PATCH",
                    body: JSON.stringify({ estado, observacion })
                }
            );

            cerrarModales();

            await cargarDatos();

            mostrarToast(
                "Estado actualizado",
                `#${actualizado.guia} · ${ESTADOS[actualizado.estado].texto}`
            );
        } catch (error) {
            mostrarError("errorEstado", error.message);
        }
    });
}

async function eliminarPedido(id) {
    const pedido = buscarPedido(id);

    if (!pedido) {
        return;
    }

    if (!window.confirm(`¿Eliminar el pedido #${pedido.guia}? Esta acción no se puede deshacer.`)) {
        return;
    }

    await ejecutar(async () => {
        await api(`/pedidos/${encodeURIComponent(id)}`, { method: "DELETE" });

        cerrarModales();

        await cargarDatos();

        mostrarToast("Pedido eliminado", `Se eliminó el pedido #${pedido.guia}.`);
    });
}

async function cancelarPedido(id) {
    const pedido = buscarPedido(id);

    if (!pedido) {
        return;
    }

    if (!window.confirm(`¿Cancelar el pedido #${pedido.guia}?`)) {
        return;
    }

    await ejecutar(async () => {
        await api(`/pedidos/${encodeURIComponent(id)}/estado`, {
            method: "PATCH",
            body: JSON.stringify({
                estado: "CANCELADO",
                observacion: "Cancelado por el administrador"
            })
        });

        await cargarDatos();

        mostrarToast("Pedido cancelado", `Se canceló el pedido #${pedido.guia}.`);
    });
}

async function ejecutar(operacion) {
    if (datos.ocupado) {
        return;
    }

    datos.ocupado = true;

    try {
        await operacion();
    } catch (error) {
        mostrarToast("No se pudo completar", error.message, "error");
    } finally {
        datos.ocupado = false;
    }
}

function manejarAccion(accion, id) {
    const acciones = {
        nuevo: () => abrirFormulario(null),
        cerrar: cerrarModales,
        ver: () => abrirDetalle(id),
        editar: () => {
            const pedido = buscarPedido(id);

            if (pedido) {
                abrirFormulario(pedido);
            }
        },
        asignar: () => abrirAsignar(id),
        estado: () => abrirEstado(id),
        eliminar: () => eliminarPedido(id),
        cancelar: () => cancelarPedido(id)
    };

    if (acciones[accion]) {
        acciones[accion]();
    }
}

async function actualizarManual() {
    const boton = el("botonActualizar");

    boton.disabled = true;
    boton.textContent = "Actualizando...";

    try {
        await cargarDatos();

        mostrarToast("Datos actualizados", "La información está al día.");
    } catch (error) {
        mostrarToast("No se pudo actualizar", error.message, "error");
    } finally {
        boton.disabled = false;
        boton.textContent = "↻ Actualizar";
    }
}

function registrarEventos() {
    document.querySelectorAll(".item-menu[data-seccion]").forEach((boton) => {
        boton.addEventListener("click", () => mostrarSeccion(boton.dataset.seccion));
    });

    document.addEventListener("click", (evento) => {
        const objetivo = evento.target.closest("[data-accion]");

        if (objetivo) {
            manejarAccion(objetivo.dataset.accion, objetivo.dataset.id);
        }
    });

    document.querySelectorAll(".modal-fondo").forEach((fondo) => {
        fondo.addEventListener("click", (evento) => {
            if (evento.target === fondo) {
                cerrarModales();
            }
        });
    });

    el("botonMenu").addEventListener("click", () => {
        if (el("barraLateral").classList.contains("expandida")) {
            cerrarMenu();
        } else {
            abrirMenu();
        }
    });

    el("overlayMenu").addEventListener("click", cerrarMenu);

    el("botonActualizar").addEventListener("click", actualizarManual);

    el("buscarPedido").addEventListener("input", renderTablaPedidos);

    el("filtroEstado").addEventListener("change", renderTablaPedidos);

    el("filtroAsignacion").addEventListener("change", renderTablaPedidos);

    el("formPedido").addEventListener("submit", guardarPedido);

    el("formAsignar").addEventListener("submit", guardarAsignacion);

    el("formEstado").addEventListener("submit", guardarEstado);

    el("selectEstado").addEventListener("change", alternarObservacion);

    CAMPOS_OBLIGATORIOS.forEach((id) => {
        el(id).addEventListener("input", () => el(id).classList.remove("invalido"));
    });

    el("botonCerrarSesion").addEventListener("click", () => {
        if (window.confirm("¿Deseas cerrar la sesión?")) {
            irALogin();
        }
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key !== "Escape") {
            return;
        }

        cerrarModales();
        cerrarMenu();
    });
}

async function iniciar() {
    if (!leerSesion("token") || leerSesion("rol") !== "ADMINISTRADOR") {
        irALogin();
        return;
    }

    llenarFiltroEstados();

    registrarEventos();

    try {
        datos.perfil = await api("/perfil");

        renderPerfil();

        await cargarDatos();
    } catch (error) {
        mostrarToast("No se pudo cargar el panel", error.message, "error");
    }

    setInterval(refrescarSilencioso, 60000);
}

iniciar();
