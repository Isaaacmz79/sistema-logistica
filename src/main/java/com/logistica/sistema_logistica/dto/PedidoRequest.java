package com.logistica.sistema_logistica.dto;

import lombok.Data;

@Data
public class PedidoRequest {

    private String nombreRemitente;

    private String nombreDestinatario;

    private String telefonoDestinatario;

    private String direccionDestino;

    private String ciudadDestino;

    private String descripcion;

    private String prioridad;

    private double distanciaKm;

    private int tiempoEstimadoMin;

    private String domiciliario;
}
