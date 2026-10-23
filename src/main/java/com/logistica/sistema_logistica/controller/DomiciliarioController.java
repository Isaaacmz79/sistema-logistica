package com.logistica.sistema_logistica.controller;

import com.logistica.sistema_logistica.dto.CambioEstadoPedidoRequest;
import com.logistica.sistema_logistica.dto.EstadoTrabajoRequest;
import com.logistica.sistema_logistica.dto.PerfilDomiciliarioResponse;
import com.logistica.sistema_logistica.model.Notificacion;
import com.logistica.sistema_logistica.model.Pedido;
import com.logistica.sistema_logistica.service.DomiciliarioService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/domiciliario")
public class DomiciliarioController {

    private final DomiciliarioService domiciliarioService;

    public DomiciliarioController(DomiciliarioService domiciliarioService) {
        this.domiciliarioService = domiciliarioService;
    }

    @GetMapping("/perfil")
    public PerfilDomiciliarioResponse perfil(Authentication authentication) {
        return domiciliarioService.obtenerPerfil(authentication.getName());
    }

    @PutMapping("/estado-trabajo")
    public PerfilDomiciliarioResponse estadoTrabajo(
            Authentication authentication,
            @RequestBody EstadoTrabajoRequest request) {
        return domiciliarioService.actualizarEstadoTrabajo(
                authentication.getName(),
                request.getEstado());
    }

    @GetMapping("/pedidos")
    public List<Pedido> pedidos(Authentication authentication) {
        return domiciliarioService.listarPedidos(authentication.getName());
    }

    @PatchMapping("/pedidos/{id}/estado")
    public Pedido cambiarEstado(
            Authentication authentication,
            @PathVariable String id,
            @RequestBody CambioEstadoPedidoRequest request) {
        return domiciliarioService.cambiarEstado(
                authentication.getName(),
                id,
                request);
    }

    @GetMapping("/notificaciones")
    public List<Notificacion> notificaciones(Authentication authentication) {
        return domiciliarioService.listarNotificaciones(
                authentication.getName());
    }

    @PostMapping("/notificaciones/leer")
    public ResponseEntity<Void> leerNotificaciones(
            Authentication authentication) {
        domiciliarioService.marcarNotificacionesLeidas(
                authentication.getName());
        return ResponseEntity.noContent().build();
    }
}
