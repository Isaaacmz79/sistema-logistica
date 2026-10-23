package com.logistica.sistema_logistica.dto;

import com.logistica.sistema_logistica.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RegistroRequest {

    private String nombre;

    private String usuario;

    private String correo;

    private String password;

    private String confirmarPassword;

    private RolUsuario rol;
}