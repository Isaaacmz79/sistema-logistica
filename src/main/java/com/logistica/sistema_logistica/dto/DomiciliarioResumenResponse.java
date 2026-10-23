package com.logistica.sistema_logistica.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DomiciliarioResumenResponse {

    private String nombre;

    private String usuario;

    private String correo;

    private String estadoTrabajo;

    private boolean activo;

    private long pedidosActivos;

    private long pedidosEntregados;
}
