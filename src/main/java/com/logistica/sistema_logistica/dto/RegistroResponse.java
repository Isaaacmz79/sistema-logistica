package com.logistica.sistema_logistica.dto;

import com.logistica.sistema_logistica.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistroResponse {

    private String mensaje;

    private String usuario;

    private String nombre;

    private String correo;

    private RolUsuario rol;
}