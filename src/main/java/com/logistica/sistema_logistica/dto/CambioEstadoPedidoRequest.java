package com.logistica.sistema_logistica.dto;

import com.logistica.sistema_logistica.enums.EstadoPedido;
import lombok.Data;

@Data
public class CambioEstadoPedidoRequest {

    private EstadoPedido estado;

    private String observacion;
}
