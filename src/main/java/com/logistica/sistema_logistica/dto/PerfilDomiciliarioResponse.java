package com.logistica.sistema_logistica.dto;

import com.logistica.sistema_logistica.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PerfilDomiciliarioResponse {

    private String nombre;

    private String usuario;

    private String correo;

    private RolUsuario rol;

    private String estadoTrabajo;
}
