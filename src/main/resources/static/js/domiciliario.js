"use strict";

const API = "/api/domiciliario";

const ESTADOS = {
    EN_CIUDAD_DESTINO: { texto: "Pendiente", clase: "pendiente" },
    EN_REPARTO: { texto: "En ruta", clase: "en-ruta" },
    ENTREGADO: { texto: "Entregado", clase: "completado" },
    NOVEDAD: { texto: "Novedad", clase: "novedad" },
    CANCELADO: { texto: "Cancelado", clase: "cancelado" }
};

const ESTADOS_ACTIVOS = ["EN_REPARTO", "EN_CIUDAD_DESTINO", "NOVEDAD"];

const ESTADOS_HISTORIAL = ["ENTREGADO", "CANCELADO"];

const ORDEN_ESTADO = { EN_REPARTO: 0, EN_CIUDAD_DESTINO: 1, NOVEDAD: 2 };

const CLASE_ESTADO_TRABAJO = {
    "Disponible": "",
    "En ruta": "en-ruta",
    "No disponible": "no-disponible"
};

const TITULOS_SECCION = {
    inicio: "Inicio",
    pedidos: "Mis pedidos",
    ruta: "Mi ruta",
    historial: "Historial",
    perfil: "Mi perfil"
};

const MENSAJES_CAMBIO = {
    EN_REPARTO: ["Entrega iniciada", "El pedido quedó en ruta."],
    ENTREGADO: ["Pedido entregado", "La entrega se registró correctamente."],
    NOVEDAD: ["Novedad reportada", "Se registró la novedad del pedido."]
};

const ESCAPES_HTML = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
};

const datos = {
    perfil: null,
    pedidos: [],
    notificaciones: [],
    ocupado: false,
    pedidoNovedad: null,
    temporizadorToast: null,
    vacioPedidoPrincipal: "",
    vacioHistorial: "",
    vacioNotificaciones: ""
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
        return "D";
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

    return resto ? `${horas}h ${resto}m` : `${horas}h`;
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

function tiempoRelativo(iso) {
    const minutos = Math.max(
        0,
        Math.round((Date.now() - new Date(iso).getTime()) / 60000)
    );

    if (minutos < 1) {
        return "Ahora";
    }

    if (minutos < 60) {
        return `Hace ${minutos} min`;
    }

    const horas = Math.round(minutos / 60);

    if (horas < 24) {
        return `Hace ${horas} h`;
    }

    return formatearFecha(iso);
}

function urlMapa(pedido) {
    const consulta = [pedido.direccionDestino, pedido.ciudadDestino]
        .filter(Boolean)
        .join(", ");

    return "https://www.google.com/maps/search/?api=1&query="
        + encodeURIComponent(consulta);
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

function pedidosActivos() {
    return datos.pedidos
        .filter((pedido) => ESTADOS_ACTIVOS.includes(pedido.estado))
        .sort((a, b) =>
            ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]
            || (a.prioridad === "Alta" ? 0 : 1) - (b.prioridad === "Alta" ? 0 : 1)
            || String(a.fechaCreacion).localeCompare(String(b.fechaCreacion))
        );
}

function pedidosHistorial() {
    return datos.pedidos
        .filter((pedido) => ESTADOS_HISTORIAL.includes(pedido.estado))
        .sort((a, b) =>
            String(b.fechaActualizacion).localeCompare(String(a.fechaActualizacion))
        );
}

function badgeEstado(estado) {
    const info = ESTADOS[estado] || { texto: estado, clase: "pendiente" };

    return `<span class="badge-estado ${info.clase}">${info.texto}</span>`;
}

function badgePrioridad(prioridad) {
    const clase = prioridad === "Alta" ? "prioridad-alta" : "prioridad-normal";

    return `<span class="badge-prioridad ${clase}">${escapar(prioridad || "Normal")}</span>`;
}

function botonAccion(accion, texto, id, clase) {
    return `<button type="button" class="${clase}" data-accion="${accion}" data-id="${escapar(id)}">${texto}</button>`;
}

function botonesEstado(pedido, claseBase) {
    const principal = `${claseBase} boton-accion`;

    if (pedido.estado === "EN_CIUDAD_DESTINO") {
        return botonAccion("iniciar", "Iniciar entrega", pedido.id, principal);
    }

    if (pedido.estado === "EN_REPARTO") {
        return botonAccion("entregar", "Marcar entregado", pedido.id, principal)
            + botonAccion("novedad", "Reportar novedad", pedido.id, `${claseBase} boton-alerta`);
    }

    if (pedido.estado === "NOVEDAD") {
        return botonAccion("reintentar", "Reintentar entrega", pedido.id, principal);
    }

    return "";
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
    const primerNombre = nombre.trim().split(/\s+/)[0];
    const sigla = iniciales(nombre);

    ["nombreSidebar", "nombreSuperior", "nombrePerfil", "datoNombre"].forEach((id) => {
        el(id).textContent = nombre;
    });

    el("nombreBienvenida").textContent = primerNombre;
    el("datoUsuario").textContent = perfil.usuario;
    el("datoCorreo").textContent = perfil.correo;
    el("datoRol").textContent = perfil.rol;

    ["avatarSidebar", "avatarSuperior", "avatarPerfil"].forEach((id) => {
        el(id).textContent = sigla;
    });

    el("selectEstadoTrabajo").value = perfil.estadoTrabajo;

    const indicador = el("estadoSidebar");

    indicador.className = `estado-indicador ${CLASE_ESTADO_TRABAJO[perfil.estadoTrabajo] || ""}`.trim();
    indicador.title = perfil.estadoTrabajo;
}

function renderEstadisticas() {
    const total = datos.pedidos.length;
    const entregados = datos.pedidos.filter((p) => p.estado === "ENTREGADO").length;
    const cancelados = datos.pedidos.filter((p) => p.estado === "CANCELADO").length;
    const activos = pedidosActivos();
    const enRuta = activos.filter((p) => p.estado === "EN_REPARTO").length;
    const base = total - cancelados;
    const cumplimiento = base > 0 ? Math.round((entregados / base) * 100) : 0;

    el("pedidosAsignados").textContent = total;
    el("entregasCompletadas").textContent = entregados;
    el("entregasPendientes").textContent = activos.length;
    el("indiceCumplimiento").textContent = `${cumplimiento}%`;
    el("contadorPedidosMenu").textContent = activos.length;

    el("variacionPedidos").textContent = total === 0
        ? "Sin información"
        : enRuta > 0
            ? `${enRuta} en ruta ahora`
            : "Ninguno en ruta";
}

function renderPedidoPrincipal() {
    const contenedor = el("pedidoPrincipal");
    const insignia = el("estadoPedidoPrincipal");
    const siguiente = pedidosActivos()[0];

    if (!siguiente) {
        contenedor.innerHTML = datos.vacioPedidoPrincipal;
        insignia.className = "badge-estado pendiente";
        insignia.textContent = "Pendiente";
        return;
    }

    const info = ESTADOS[siguiente.estado];

    insignia.className = `badge-estado ${info.clase}`;
    insignia.textContent = info.texto;

    contenedor.innerHTML = `
        <div class="pedido-destacado">
            <div class="pedido-destacado-cabecera">
                <div>
                    <strong>#${escapar(siguiente.guia)}</strong>
                    <span>${escapar(siguiente.nombreDestinatario)}</span>
                </div>
                ${badgePrioridad(siguiente.prioridad)}
            </div>

            <ul class="pedido-destacado-datos">
                <li>
                    <span>📍</span>
                    <div>
                        <small>Dirección de entrega</small>
                        <strong>${escapar(siguiente.direccionDestino)}</strong>
                    </div>
                </li>
                <li>
                    <span>📞</span>
                    <div>
                        <small>Teléfono</small>
                        <strong>${escapar(siguiente.telefonoDestinatario || "Sin teléfono")}</strong>
                    </div>
                </li>
                <li>
                    <span>📏</span>
                    <div>
                        <small>Distancia y tiempo</small>
                        <strong>${siguiente.distanciaKm.toFixed(1)} km · ${formatearTiempo(siguiente.tiempoEstimadoMin)}</strong>
                    </div>
                </li>
            </ul>

            <div class="pedido-destacado-acciones">
                ${botonesEstado(siguiente, "boton-mini")}
                ${botonAccion("detalle", "Ver detalles", siguiente.id, "boton-mini boton-neutro")}
                <a class="boton-mini boton-neutro" href="${urlMapa(siguiente)}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>
            </div>
        </div>
    `;
}

function renderPedidos() {
    const contenedor = el("listaPedidos");
    const activos = pedidosActivos();

    if (activos.length === 0) {
        contenedor.innerHTML = `
            <div class="pedido-vacio">
                <span>📦</span>
                <strong>No tienes pedidos pendientes</strong>
                <p>Cuando tengas un pedido asignado, aparecerá aquí.</p>
            </div>
        `;
        return;
    }

    contenedor.innerHTML = activos.map((pedido) => `
        <div class="pedido-item">
            <div class="pedido-icono">📦</div>

            <div class="pedido-info">
                <strong>#${escapar(pedido.guia)} · ${escapar(pedido.nombreDestinatario)}</strong>
                <span>${escapar(pedido.direccionDestino)}</span>
            </div>

            ${badgePrioridad(pedido.prioridad)}
            ${badgeEstado(pedido.estado)}

            <div class="pedido-acciones">
                ${botonAccion("detalle", "Ver", pedido.id, "boton-mini boton-neutro")}
                ${botonesEstado(pedido, "boton-mini")}
            </div>
        </div>
    `).join("");
}

function renderRuta() {
    const activos = pedidosActivos();
    const total = datos.pedidos.length;
    const enRuta = activos.some((p) => p.estado === "EN_REPARTO");
    const insignia = el("estadoRuta");

    el("rutaTitulo").textContent = activos.length > 0
        ? `Ruta de hoy · ${activos.length} ${activos.length === 1 ? "parada" : "paradas"}`
        : "Sin ruta asignada";

    if (enRuta) {
        insignia.className = "badge-estado en-ruta";
        insignia.textContent = "En curso";
    } else if (activos.length > 0) {
        insignia.className = "badge-estado pendiente";
        insignia.textContent = "Sin iniciar";
    } else if (total > 0) {
        insignia.className = "badge-estado completado";
        insignia.textContent = "Completada";
    } else {
        insignia.className = "badge-estado pendiente";
        insignia.textContent = "Sin iniciar";
    }

    const minutos = activos.reduce((suma, p) => suma + p.tiempoEstimadoMin, 0);
    const distancia = activos.reduce((suma, p) => suma + p.distanciaKm, 0);

    el("totalParadas").textContent = activos.length;
    el("tiempoEstimado").textContent = activos.length > 0 ? formatearTiempo(minutos) : "--:--";
    el("distanciaRuta").textContent = `${distancia.toFixed(1)} km`;

    const paradas = activos.map((pedido, indice) => `
        <div class="parada parada-clic" data-accion="detalle" data-id="${escapar(pedido.id)}">
            <span class="numero-parada">${indice + 2}</span>
            <div>
                <strong>#${escapar(pedido.guia)} · ${escapar(pedido.nombreDestinatario)}</strong>
                <span>${escapar(pedido.direccionDestino)}</span>
            </div>
        </div>
    `).join("");

    el("paradasRuta").innerHTML = `
        <div class="parada">
            <span class="numero-parada">1</span>
            <div>
                <strong>Centro logístico</strong>
                <span>Punto de salida</span>
            </div>
        </div>
        ${paradas}
    `;
}

function renderHistorial() {
    const contenedor = el("listaHistorial");
    const historial = pedidosHistorial();

    if (historial.length === 0) {
        contenedor.classList.remove("con-datos");
        contenedor.innerHTML = datos.vacioHistorial;
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
                        <th>Fecha</th>
                        <th>Estado</th>
                        <th></th>
                    </tr>
                </thead>
                <tbody>
                    ${historial.map((pedido) => `
                        <tr>
                            <td><strong>#${escapar(pedido.guia)}</strong></td>
                            <td>${escapar(pedido.nombreDestinatario)}</td>
                            <td>${escapar(pedido.direccionDestino)}</td>
                            <td>${formatearFecha(pedido.fechaEntrega || pedido.fechaActualizacion)}</td>
                            <td>${badgeEstado(pedido.estado)}</td>
                            <td>${botonAccion("detalle", "Ver", pedido.id, "boton-mini boton-neutro")}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        </div>
    `;
}

function renderTodo() {
    renderEstadisticas();
    renderPedidoPrincipal();
    renderPedidos();
    renderRuta();
    renderHistorial();
}

function noLeidas() {
    return datos.notificaciones.filter((n) => !n.leida).length;
}

function actualizarInsigniaNotificaciones() {
    const insignia = el("contadorNotificaciones");
    const cantidad = noLeidas();

    insignia.textContent = cantidad;
    insignia.hidden = cantidad === 0;
}

function renderNotificaciones() {
    const lista = el("listaNotificaciones");

    actualizarInsigniaNotificaciones();

    if (datos.notificaciones.length === 0) {
        lista.innerHTML = datos.vacioNotificaciones;
        return;
    }

    lista.innerHTML = datos.notificaciones.map((n) => `
        <div class="notificacion-item ${n.leida ? "" : "nueva"}">
            <span class="notificacion-punto"></span>
            <div>
                <strong>${escapar(n.titulo)}</strong>
                <p>${escapar(n.mensaje)}</p>
                <small>${tiempoRelativo(n.fecha)}</small>
            </div>
        </div>
    `).join("");
}

async function cargarPedidos() {
    datos.pedidos = await api("/pedidos");
    renderTodo();
}

async function cargarNotificaciones() {
    datos.notificaciones = await api("/notificaciones");
    renderNotificaciones();
}

async function refrescarSilencioso() {
    try {
        await Promise.all([cargarPedidos(), cargarNotificaciones()]);
    } catch (error) {
        return;
    }
}

async function cambiarEstado(id, nuevoEstado, observacion = "") {
    if (datos.ocupado) {
        return false;
    }

    datos.ocupado = true;

    try {
        const actualizado = await api(
            `/pedidos/${encodeURIComponent(id)}/estado`,
            {
                method: "PATCH",
                body: JSON.stringify({ estado: nuevoEstado, observacion })
            }
        );

        datos.pedidos = datos.pedidos.map((p) => p.id === actualizado.id ? actualizado : p);

        cerrarModales();
        renderTodo();

        const [titulo, mensaje] = MENSAJES_CAMBIO[nuevoEstado];

        mostrarToast(titulo, `${mensaje} #${actualizado.guia}`);

        cargarNotificaciones().catch(() => {});

        return true;
    } catch (error) {
        mostrarToast("No se pudo actualizar", error.message, "error");

        return false;
    } finally {
        datos.ocupado = false;
    }
}

function buscarPedido(id) {
    return datos.pedidos.find((pedido) => pedido.id === id);
}

function fila(etiqueta, valor) {
    return `<div class="detalle-fila"><span>${etiqueta}</span><strong>${valor}</strong></div>`;
}

function abrirDetalle(id) {
    const pedido = buscarPedido(id);

    if (!pedido) {
        return;
    }

    el("modalPedidoTitulo").textContent = `Pedido #${pedido.guia}`;

    const telefono = pedido.telefonoDestinatario
        ? `<a href="tel:${escapar(pedido.telefonoDestinatario)}">${escapar(pedido.telefonoDestinatario)}</a>`
        : "Sin teléfono";

    el("modalPedidoCuerpo").innerHTML = `
        ${fila("Estado", badgeEstado(pedido.estado))}
        ${fila("Prioridad", badgePrioridad(pedido.prioridad))}
        ${fila("Destinatario", escapar(pedido.nombreDestinatario))}
        ${fila("Teléfono", telefono)}
        ${fila("Dirección", escapar(pedido.direccionDestino))}
        ${fila("Ciudad", escapar(pedido.ciudadDestino))}
        ${fila("Remitente", escapar(pedido.nombreRemitente))}
        ${fila("Contenido", escapar(pedido.descripcion))}
        ${fila("Distancia", `${pedido.distanciaKm.toFixed(1)} km`)}
        ${fila("Tiempo estimado", formatearTiempo(pedido.tiempoEstimadoMin))}
        ${fila("Creado", formatearFecha(pedido.fechaCreacion))}
        ${pedido.fechaEntrega ? fila("Entregado", formatearFecha(pedido.fechaEntrega)) : ""}
        ${pedido.observacion ? fila("Observación", escapar(pedido.observacion)) : ""}
    `;

    el("modalPedidoAcciones").innerHTML = `
        <a class="boton-secundario boton-enlace" href="${urlMapa(pedido)}" target="_blank" rel="noopener noreferrer">Cómo llegar</a>
        ${botonesEstado(pedido, "boton-modal")}
    `;

    el("modalPedido").hidden = false;
    document.body.classList.add("modal-abierto");
}

function abrirNovedad(id) {
    const pedido = buscarPedido(id);

    if (!pedido) {
        return;
    }

    cerrarModales();

    datos.pedidoNovedad = id;

    el("modalNovedadTitulo").textContent = `Reportar novedad · #${pedido.guia}`;
    el("textoNovedad").value = "";
    el("modalNovedad").hidden = false;

    document.body.classList.add("modal-abierto");

    el("textoNovedad").focus();
}

function cerrarModales() {
    el("modalPedido").hidden = true;
    el("modalNovedad").hidden = true;

    datos.pedidoNovedad = null;

    document.body.classList.remove("modal-abierto");
}

function manejarAccion(accion, id) {
    if (accion === "detalle") {
        abrirDetalle(id);
        return;
    }

    if (accion === "iniciar" || accion === "reintentar") {
        cambiarEstado(id, "EN_REPARTO");
        return;
    }

    if (accion === "entregar") {
        const pedido = buscarPedido(id);

        if (pedido && window.confirm(`¿Confirmas la entrega del pedido #${pedido.guia}?`)) {
            cambiarEstado(id, "ENTREGADO");
        }

        return;
    }

    if (accion === "novedad") {
        abrirNovedad(id);
    }
}

function alternarNotificaciones() {
    const panel = el("panelNotificaciones");
    const abrir = !panel.classList.contains("activo");

    panel.classList.toggle("activo", abrir);

    if (!abrir) {
        return;
    }

    renderNotificaciones();

    if (noLeidas() === 0) {
        return;
    }

    api("/notificaciones/leer", { method: "POST" })
        .then(() => {
            datos.notificaciones.forEach((n) => {
                n.leida = true;
            });

            actualizarInsigniaNotificaciones();
        })
        .catch(() => {});
}

function cerrarNotificaciones() {
    el("panelNotificaciones").classList.remove("activo");
}

async function cambiarEstadoTrabajo(evento) {
    const select = evento.target;
    const anterior = datos.perfil.estadoTrabajo;

    try {
        datos.perfil = await api("/estado-trabajo", {
            method: "PUT",
            body: JSON.stringify({ estado: select.value })
        });

        renderPerfil();

        mostrarToast("Estado actualizado", `Ahora figuras como: ${datos.perfil.estadoTrabajo}.`);
    } catch (error) {
        select.value = anterior;

        mostrarToast("No se pudo actualizar", error.message, "error");
    }
}

async function actualizarPedidosManual() {
    const boton = el("botonActualizarPedidos");

    boton.disabled = true;
    boton.textContent = "Actualizando...";

    try {
        await Promise.all([cargarPedidos(), cargarNotificaciones()]);

        mostrarToast("Pedidos actualizados", "La información está al día.");
    } catch (error) {
        mostrarToast("No se pudo actualizar", error.message, "error");
    } finally {
        boton.disabled = false;
        boton.textContent = "↻ Actualizar";
    }
}

function registrarEventos() {
    document.querySelectorAll("[data-seccion]").forEach((boton) => {
        boton.addEventListener("click", () => mostrarSeccion(boton.dataset.seccion));
    });

    document.addEventListener("click", (evento) => {
        const boton = evento.target.closest("[data-accion]");

        if (boton) {
            manejarAccion(boton.dataset.accion, boton.dataset.id);
        }

        const panel = el("panelNotificaciones");

        if (
            panel.classList.contains("activo")
            && !panel.contains(evento.target)
            && !el("botonNotificaciones").contains(evento.target)
        ) {
            cerrarNotificaciones();
        }
    });

    el("botonMenu").addEventListener("click", () => {
        if (el("barraLateral").classList.contains("expandida")) {
            cerrarMenu();
        } else {
            abrirMenu();
        }
    });

    el("overlayMenu").addEventListener("click", cerrarMenu);

    el("botonNotificaciones").addEventListener("click", alternarNotificaciones);

    el("cerrarNotificaciones").addEventListener("click", cerrarNotificaciones);

    el("selectEstadoTrabajo").addEventListener("change", cambiarEstadoTrabajo);

    el("botonActualizarPedidos").addEventListener("click", actualizarPedidosManual);

    el("botonCerrarSesion").addEventListener("click", () => {
        if (window.confirm("¿Deseas cerrar la sesión?")) {
            irALogin();
        }
    });

    document.querySelector(".soporte-sidebar").addEventListener("click", () => {
        mostrarToast("Soporte LogiSIS", "Comunícate con tu administrador para recibir ayuda.");
    });

    el("cerrarModalPedido").addEventListener("click", cerrarModales);

    el("cerrarModalNovedad").addEventListener("click", cerrarModales);

    el("cancelarNovedad").addEventListener("click", cerrarModales);

    [el("modalPedido"), el("modalNovedad")].forEach((fondo) => {
        fondo.addEventListener("click", (evento) => {
            if (evento.target === fondo) {
                cerrarModales();
            }
        });
    });

    el("formNovedad").addEventListener("submit", (evento) => {
        evento.preventDefault();

        const texto = el("textoNovedad").value.trim();

        if (!texto) {
            mostrarToast("Falta información", "Describe la novedad del pedido.", "error");
            return;
        }

        cambiarEstado(datos.pedidoNovedad, "NOVEDAD", texto);
    });

    document.addEventListener("keydown", (evento) => {
        if (evento.key !== "Escape") {
            return;
        }

        cerrarModales();
        cerrarNotificaciones();
        cerrarMenu();
    });
}

async function iniciar() {
    if (!leerSesion("token") || leerSesion("rol") !== "DOMICILIARIO") {
        irALogin();
        return;
    }

    datos.vacioPedidoPrincipal = el("pedidoPrincipal").innerHTML;
    datos.vacioHistorial = el("listaHistorial").innerHTML;
    datos.vacioNotificaciones = el("listaNotificaciones").innerHTML;

    registrarEventos();

    actualizarInsigniaNotificaciones();

    try {
        const [perfil, pedidos, notificaciones] = await Promise.all([
            api("/perfil"),
            api("/pedidos"),
            api("/notificaciones")
        ]);

        datos.perfil = perfil;
        datos.pedidos = pedidos;
        datos.notificaciones = notificaciones;

        renderPerfil();
        renderTodo();
        renderNotificaciones();
    } catch (error) {
        mostrarToast("No se pudo cargar el panel", error.message, "error");
    }

    setInterval(refrescarSilencioso, 60000);
}

iniciar();
