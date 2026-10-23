package com.logistica.sistema_logistica.service;

import com.logistica.sistema_logistica.dto.CambioEstadoPedidoRequest;
import com.logistica.sistema_logistica.dto.PerfilDomiciliarioResponse;
import com.logistica.sistema_logistica.enums.EstadoPedido;
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
import java.util.List;
import java.util.Set;

@Service
public class DomiciliarioService {

    private static final Set<String> ESTADOS_TRABAJO =
            Set.of("Disponible", "En ruta", "No disponible");

    private final UsuarioRepository usuarioRepository;
    private final PedidoRepository pedidoRepository;
    private final NotificacionRepository notificacionRepository;

    public DomiciliarioService(
            UsuarioRepository usuarioRepository,
            PedidoRepository pedidoRepository,
            NotificacionRepository notificacionRepository) {
        this.usuarioRepository = usuarioRepository;
        this.pedidoRepository = pedidoRepository;
        this.notificacionRepository = notificacionRepository;
    }

    public PerfilDomiciliarioResponse obtenerPerfil(String usuario) {
        return aPerfil(buscarUsuario(usuario));
    }

    public PerfilDomiciliarioResponse actualizarEstadoTrabajo(
            String usuario,
            String estado) {

        if (estado == null || !ESTADOS_TRABAJO.contains(estado)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Estado de trabajo no válido");
        }

        Usuario encontrado = buscarUsuario(usuario);
        encontrado.setEstadoTrabajo(estado);

        return aPerfil(usuarioRepository.save(encontrado));
    }

    public List<Pedido> listarPedidos(String usuario) {
        return pedidoRepository
                .findByDomiciliarioOrderByFechaCreacionAsc(usuario);
    }

    public Pedido cambiarEstado(
            String usuario,
            String idPedido,
            CambioEstadoPedidoRequest request) {

        Pedido pedido = pedidoRepository
                .findByIdAndDomiciliario(idPedido, usuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Pedido no encontrado"));

        EstadoPedido nuevo = request.getEstado();

        if (nuevo == null || !transicionPermitida(pedido.getEstado(), nuevo)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "No es posible pasar el pedido de "
                            + pedido.getEstado() + " a " + nuevo);
        }

        String observacion = request.getObservacion() == null
                ? ""
                : request.getObservacion().trim();

        if (nuevo == EstadoPedido.NOVEDAD && observacion.isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Describe la novedad del pedido");
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

        notificar(usuario, tituloNotificacion(nuevo), guardado);

        return guardado;
    }

    public List<Notificacion> listarNotificaciones(String usuario) {
        return notificacionRepository
                .findTop30ByUsuarioOrderByFechaDesc(usuario);
    }

    public void marcarNotificacionesLeidas(String usuario) {
        List<Notificacion> pendientes = notificacionRepository
                .findByUsuarioAndLeidaFalse(usuario);

        pendientes.forEach(notificacion -> notificacion.setLeida(true));

        notificacionRepository.saveAll(pendientes);
    }

    private boolean transicionPermitida(
            EstadoPedido actual,
            EstadoPedido nuevo) {

        if (actual == EstadoPedido.EN_CIUDAD_DESTINO) {
            return nuevo == EstadoPedido.EN_REPARTO;
        }

        if (actual == EstadoPedido.EN_REPARTO) {
            return nuevo == EstadoPedido.ENTREGADO
                    || nuevo == EstadoPedido.NOVEDAD;
        }

        if (actual == EstadoPedido.NOVEDAD) {
            return nuevo == EstadoPedido.EN_REPARTO;
        }

        return false;
    }

    private String tituloNotificacion(EstadoPedido estado) {
        return switch (estado) {
            case EN_REPARTO -> "Entrega iniciada";
            case ENTREGADO -> "Pedido entregado";
            case NOVEDAD -> "Novedad reportada";
            default -> "Pedido actualizado";
        };
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

    private Usuario buscarUsuario(String usuario) {
        return usuarioRepository.findByUsuario(usuario)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Usuario no encontrado"));
    }

    private PerfilDomiciliarioResponse aPerfil(Usuario usuario) {
        String estado = usuario.getEstadoTrabajo() == null
                ? "Disponible"
                : usuario.getEstadoTrabajo();

        return new PerfilDomiciliarioResponse(
                usuario.getNombre(),
                usuario.getUsuario(),
                usuario.getCorreo(),
                usuario.getRol(),
                estado
        );
    }
}
