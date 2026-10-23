//CONEXION CON MONGODB
package com.logistica.sistema_logistica.repository;

import com.logistica.sistema_logistica.enums.RolUsuario;
import com.logistica.sistema_logistica.model.Usuario;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface UsuarioRepository extends MongoRepository<Usuario, String> {

    Optional<Usuario> findByUsuario(String usuario);

    boolean existsByUsuario(String usuario);

    boolean existsByCorreo(String correo);

    List<Usuario> findByRol(RolUsuario rol);
}
