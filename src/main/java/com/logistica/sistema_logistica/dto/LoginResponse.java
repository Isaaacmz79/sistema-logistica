package com.logistica.sistema_logistica.dto;

import com.logistica.sistema_logistica.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LoginResponse {

    private String token;

    private String usuario;

    private String nombre;

    private RolUsuario rol;
}