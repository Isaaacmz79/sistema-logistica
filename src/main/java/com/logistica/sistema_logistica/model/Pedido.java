package com.logistica.sistema_logistica.model;

import com.logistica.sistema_logistica.enums.EstadoPedido;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "pedidos")
public class Pedido {

    @Id
    private String id;

    private String guia;

    private String nombreRemitente;

    private String nombreDestinatario;

    private String telefonoDestinatario;

    private String direccionOrigen;

    private String direccionDestino;

    private String ciudadOrigen;

    private String ciudadDestino;

    private String descripcion;

    private String prioridad;

    private String domiciliario;

    private double distanciaKm;

    private int tiempoEstimadoMin;

    private String observacion;

    private EstadoPedido estado;

    private LocalDateTime fechaCreacion;

    private LocalDateTime fechaActualizacion;

    private LocalDateTime fechaEntrega;
}
