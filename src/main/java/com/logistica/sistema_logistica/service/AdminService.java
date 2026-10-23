package com.logistica.sistema_logistica.service;

import com.logistica.sistema_logistica.dto.CambioEstadoPedidoRequest;
import com.logistica.sistema_logistica.dto.DomiciliarioResumenResponse;
import com.logistica.sistema_logistica.dto.PedidoRequest;
import com.logistica.sistema_logistica.dto.PerfilDomiciliarioResponse;
import com.logistica.sistema_logistica.enums.EstadoPedido;
import com.logistica.sistema_logistica.enums.RolUsuario;
import com.logistica.sistema_logistica.model.Notificacion;
import com.logistica.sistema_logistica.model.Pedido;
import com.logistica.sistema_logistica.model.Usuario;
import com.logistica.sistema_logistica.repository.NotificacionRepository;
import com.logistica.sistema_logistica.repository.PedidoRepository;
import com.logistica.sistema_logistica.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Service
public class AdminService {

    private static final String PREFIJO_GUIA = "LG-";

    private static final int PRIMERA_GUIA = 1001;

    private static final String ORIGEN_DIRECCION = "Centro logístico principal";

    private static final String ORIGEN_CIUDAD = "Bogotá";

    private static final Set<String> PRIORIDADES = Set.of("Normal", "Alta");

    private static final Set<EstadoPedido> ESTADOS_FINALES =
            Set.of(EstadoPedido.ENTREGADO, EstadoPedido.CANCELADO);

    private static final Set<EstadoPedido> ESTADOS_ASIGNABLES = Set.of(
            EstadoPedido.CREADO,
            EstadoPedido.RECOGIDO,
            EstadoPedido.EN_CENTRO_LOGISTICO,
            EstadoPedido.EN_TRANSITO,
            EstadoPedido.EN_CIUDAD_DESTINO,
            EstadoPedido.NOVEDAD);

    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;
    private final NotificacionRepository notificacionRepository;

    public AdminService(
            PedidoRepository pedidoRepository,
            UsuarioRepository usuarioRepository,
            NotificacionRepository notificacionRepository) {
        this.pedidoRepository = pedidoRepository;
        this.usuarioRepository = usuarioRepository;
        this.notificacionRepository = notificacionRepository;
    }

    public PerfilDomiciliarioResponse obtenerPerfil(String usuario) {
        Usuario encontrado = usuarioRepository.findByUsuario(usuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Usuario no encontrado"));

        return new PerfilDomiciliarioResponse(
                encontrado.getNombre(),
                encontrado.getUsuario(),
                encontrado.getCorreo(),
                encontrado.getRol(),
                encontrado.getEstadoTrabajo());
    }

    public List<Pedido> listarPedidos() {
        List<Pedido> pedidos = pedidoRepository.findAll();

        pedidos.sort(Comparator.comparing(
                Pedido::getFechaCreacion,
                Comparator.nullsLast(Comparator.reverseOrder())));

        return pedidos;
    }

    public Pedido crearPedido(PedidoRequest request) {
        validarDatos(request);

        Pedido pedido = new Pedido();

        aplicarDatos(pedido, request);

        pedido.setGuia(generarGuia());
        pedido.setDireccionOrigen(ORIGEN_DIRECCION);
        pedido.setCiudadOrigen(ORIGEN_CIUDAD);
        pedido.setEstado(EstadoPedido.CREADO);
        pedido.setFechaCreacion(LocalDateTime.now());
        pedido.setFechaActualizacion(pedido.getFechaCreacion());

        String domiciliario = limpiar(request.getDomiciliario());

        if (!domiciliario.isEmpty()) {
            asignarInterno(pedido, domiciliario);
        }

        Pedido guardado = pedidoRepository.save(pedido);

        if (!domiciliario.isEmpty()) {
            notificar(guardado.getDomiciliario(), "Nuevo pedido asignado", guardado);
        }

        return guardado;
    }

    public Pedido editarPedido(String id, PedidoRequest request) {
        Pedido pedido = buscarPedido(id);

        if (ESTADOS_FINALES.contains(pedido.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No se puede editar un pedido entregado o cancelado");
        }

        validarDatos(request);

        aplicarDatos(pedido, request);

        pedido.setFechaActualizacion(LocalDateTime.now());

        return pedidoRepository.save(pedido);
    }

    public void eliminarPedido(String id) {
        pedidoRepository.delete(buscarPedido(id));
    }

    public Pedido asignarPedido(String id, String domiciliario) {
        Pedido pedido = buscarPedido(id);

        String usuario = limpiar(domiciliario);

        if (usuario.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Selecciona un domiciliario");
        }

        asignarInterno(pedido, usuario);

        Pedido guardado = pedidoRepository.save(pedido);

        notificar(guardado.getDomiciliario(), "Nuevo pedido asignado", guardado);

        return guardado;
    }

    public Pedido cambiarEstado(
            String id,
            CambioEstadoPedidoRequest request) {

        Pedido pedido = buscarPedido(id);

        EstadoPedido nuevo = request.getEstado();

        if (nuevo == null) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Estado no válido");
        }

        if (ESTADOS_FINALES.contains(pedido.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El pedido ya está " + pedido.getEstado()
                            + " y no se puede modificar");
        }

        if (nuevo == pedido.getEstado()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El pedido ya tiene ese estado");
        }

        String observacion = limpiar(request.getObservacion());

        if (nuevo == EstadoPedido.NOVEDAD && observacion.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Describe la novedad del pedido");
        }

        if (nuevo == EstadoPedido.EN_REPARTO
                && limpiar(pedido.getDomiciliario()).isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Asigna un domiciliario antes de enviar el pedido a reparto");
        }

        LocalDateTime ahora = LocalDateTime.now();

        pedido.setEstado(nuevo);
        pedido.setFechaActualizacion(ahora);

        if (!observacion.isEmpty()) {
            pedido.setObservacion(observacion);
        }

        if (nuevo == EstadoPedido.ENTREGADO) {
            pedido.setFechaEntrega(ahora);
        }

        Pedido guardado = pedidoRepository.save(pedido);

        if (!limpiar(guardado.getDomiciliario()).isEmpty()
                && nuevo == EstadoPedido.CANCELADO) {
            notificar(
                    guardado.getDomiciliario(),
                    "Pedido cancelado",
                    guardado);
        }

        return guardado;
    }

    public List<DomiciliarioResumenResponse> listarDomiciliarios() {
        return usuarioRepository.findByRol(RolUsuario.DOMICILIARIO)
                .stream()
                .map(this::aResumen)
                .toList();
    }

    private DomiciliarioResumenResponse aResumen(Usuario usuario) {
        List<Pedido> pedidos = pedidoRepository
                .findByDomiciliarioOrderByFechaCreacionAsc(
                        usuario.getUsuario());

        long entregados = pedidos.stream()
                .filter(p -> p.getEstado() == EstadoPedido.ENTREGADO)
                .count();

        long finalizados = pedidos.stream()
                .filter(p -> ESTADOS_FINALES.contains(p.getEstado()))
                .count();

        return new DomiciliarioResumenResponse(
                usuario.getNombre(),
                usuario.getUsuario(),
                usuario.getCorreo(),
                usuario.getEstadoTrabajo() == null
                        ? "Disponible"
                        : usuario.getEstadoTrabajo(),
                usuario.isActivo(),
                pedidos.size() - finalizados,
                entregados);
    }

    private void asignarInterno(Pedido pedido, String usuario) {
        if (ESTADOS_FINALES.contains(pedido.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No se puede asignar un pedido entregado o cancelado");
        }

        if (pedido.getEstado() != null
                && !ESTADOS_ASIGNABLES.contains(pedido.getEstado())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El pedido ya está en reparto");
        }

        Usuario domiciliario = usuarioRepository.findByUsuario(usuario)
                .filter(u -> u.getRol() == RolUsuario.DOMICILIARIO)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "El domiciliario seleccionado no existe"));

        if (!domiciliario.isActivo()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "El domiciliario seleccionado está inactivo");
        }

        pedido.setDomiciliario(domiciliario.getUsuario());
        pedido.setEstado(EstadoPedido.EN_CIUDAD_DESTINO);
        pedido.setFechaActualizacion(LocalDateTime.now());
    }

    private void validarDatos(PedidoRequest request) {
        exigir(request.getNombreRemitente(), "El remitente es obligatorio");
        exigir(request.getNombreDestinatario(), "El destinatario es obligatorio");
        exigir(request.getTelefonoDestinatario(), "El teléfono es obligatorio");
        exigir(request.getDireccionDestino(), "La dirección es obligatoria");
        exigir(request.getCiudadDestino(), "La ciudad es obligatoria");
        exigir(request.getDescripcion(), "El contenido es obligatorio");

        if (!PRIORIDADES.contains(limpiar(request.getPrioridad()))) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La prioridad debe ser Normal o Alta");
        }

        if (request.getDistanciaKm() < 0 || request.getTiempoEstimadoMin() < 0) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "La distancia y el tiempo no pueden ser negativos");
        }
    }

    private void aplicarDatos(Pedido pedido, PedidoRequest request) {
        pedido.setNombreRemitente(limpiar(request.getNombreRemitente()));
        pedido.setNombreDestinatario(limpiar(request.getNombreDestinatario()));
        pedido.setTelefonoDestinatario(limpiar(request.getTelefonoDestinatario()));
        pedido.setDireccionDestino(limpiar(request.getDireccionDestino()));
        pedido.setCiudadDestino(limpiar(request.getCiudadDestino()));
        pedido.setDescripcion(limpiar(request.getDescripcion()));
        pedido.setPrioridad(limpiar(request.getPrioridad()));
        pedido.setDistanciaKm(request.getDistanciaKm());
        pedido.setTiempoEstimadoMin(request.getTiempoEstimadoMin());
    }

    private void exigir(String valor, String mensaje) {
        if (limpiar(valor).isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, mensaje);
        }
    }

    private String limpiar(String valor) {
        return valor == null ? "" : valor.trim();
    }

    private Pedido buscarPedido(String id) {
        return pedidoRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Pedido no encontrado"));
    }

    private String generarGuia() {
        int mayor = pedidoRepository.findAll().stream()
                .map(Pedido::getGuia)
                .filter(guia -> guia != null && guia.startsWith(PREFIJO_GUIA))
                .mapToInt(guia -> {
                    try {
                        return Integer.parseInt(
                                guia.substring(PREFIJO_GUIA.length()));
                    } catch (NumberFormatException e) {
                        return 0;
                    }
                })
                .max()
                .orElse(PRIMERA_GUIA - 1);

        return PREFIJO_GUIA + Math.max(mayor + 1, PRIMERA_GUIA);
    }

    private void notificar(String usuario, String titulo, Pedido pedido) {
        Notificacion notificacion = new Notificacion();
        notificacion.setUsuario(usuario);
        notificacion.setTitulo(titulo);
        notificacion.setMensaje(
                "Pedido " + pedido.getGuia()
                        + " · " + pedido.getNombreDestinatario());
        notificacion.setLeida(false);
        notificacion.setFecha(LocalDateTime.now());

        notificacionRepository.save(notificacion);
    }
}
