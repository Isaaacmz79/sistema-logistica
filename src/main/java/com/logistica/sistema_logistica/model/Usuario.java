package com.logistica.sistema_logistica.model;

import com.logistica.sistema_logistica.enums.RolUsuario;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "usuarios")
public class Usuario {

    @Id
    private String id;

    private String nombre;

    private String usuario;

    private String correo;

    private String password;

    private RolUsuario rol;

    private boolean activo;

    private String estadoTrabajo;
}