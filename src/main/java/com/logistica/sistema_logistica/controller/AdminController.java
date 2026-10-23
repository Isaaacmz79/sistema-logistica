package com.logistica.sistema_logistica.controller;

import com.logistica.sistema_logistica.dto.AsignarPedidoRequest;
import com.logistica.sistema_logistica.dto.CambioEstadoPedidoRequest;
import com.logistica.sistema_logistica.dto.DomiciliarioResumenResponse;
import com.logistica.sistema_logistica.dto.PedidoRequest;
import com.logistica.sistema_logistica.dto.PerfilDomiciliarioResponse;
import com.logistica.sistema_logistica.model.Pedido;
import com.logistica.sistema_logistica.service.AdminService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/perfil")
    public PerfilDomiciliarioResponse perfil(Authentication authentication) {
        return adminService.obtenerPerfil(authentication.getName());
    }

    @GetMapping("/pedidos")
    public List<Pedido> pedidos() {
        return adminService.listarPedidos();
    }

    @PostMapping("/pedidos")
    public ResponseEntity<Pedido> crear(@RequestBody PedidoRequest request) {
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(adminService.crearPedido(request));
    }

    @PutMapping("/pedidos/{id}")
    public Pedido editar(
            @PathVariable String id,
            @RequestBody PedidoRequest request) {
        return adminService.editarPedido(id, request);
    }

    @DeleteMapping("/pedidos/{id}")
    public ResponseEntity<Void> eliminar(@PathVariable String id) {
        adminService.eliminarPedido(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/pedidos/{id}/asignar")
    public Pedido asignar(
            @PathVariable String id,
            @RequestBody AsignarPedidoRequest request) {
        return adminService.asignarPedido(id, request.getDomiciliario());
    }

    @PatchMapping("/pedidos/{id}/estado")
    public Pedido cambiarEstado(
            @PathVariable String id,
            @RequestBody CambioEstadoPedidoRequest request) {
        return adminService.cambiarEstado(id, request);
    }

    @GetMapping("/domiciliarios")
    public List<DomiciliarioResumenResponse> domiciliarios() {
        return adminService.listarDomiciliarios();
    }
}
