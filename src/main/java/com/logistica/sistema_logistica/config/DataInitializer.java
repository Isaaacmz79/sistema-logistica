package com.logistica.sistema_logistica.config;

import com.logistica.sistema_logistica.enums.RolUsuario;
import com.logistica.sistema_logistica.model.Usuario;
import com.logistica.sistema_logistica.repository.UsuarioRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

@Configuration
public class DataInitializer {

    @Bean
    CommandLineRunner initUsuarios(
            UsuarioRepository usuarioRepository,
            PasswordEncoder passwordEncoder) {

        return args -> {

            if (!usuarioRepository.existsByUsuario("admin")) {

                Usuario usuario = new Usuario();

                usuario.setNombre("Administrador");
                usuario.setUsuario("admin");
                usuario.setCorreo("admin@logistica.com");
                usuario.setPassword(passwordEncoder.encode("Admin123*"));
                usuario.setRol(RolUsuario.ADMINISTRADOR);
                usuario.setActivo(true);

                usuarioRepository.save(usuario);

                System.out.println("=================================");
                System.out.println("USUARIO ADMINISTRADOR CREADO");
                System.out.println("Usuario: admin");
                System.out.println("=================================");
            }
        };
    }
}
