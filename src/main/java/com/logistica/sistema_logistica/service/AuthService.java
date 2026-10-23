package com.logistica.sistema_logistica.service;

import com.logistica.sistema_logistica.dto.LoginRequest;
import com.logistica.sistema_logistica.dto.LoginResponse;
import com.logistica.sistema_logistica.dto.RegistroRequest;
import com.logistica.sistema_logistica.dto.RegistroResponse;
import com.logistica.sistema_logistica.model.Usuario;
import com.logistica.sistema_logistica.repository.UsuarioRepository;
import com.logistica.sistema_logistica.security.JwtService;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;

    public AuthService(
            UsuarioRepository usuarioRepository,
            AuthenticationManager authenticationManager,
            JwtService jwtService,
            PasswordEncoder passwordEncoder,
            EmailService emailService) {

        this.usuarioRepository = usuarioRepository;
        this.authenticationManager = authenticationManager;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
    }

    public LoginResponse login(LoginRequest request) {

        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        request.getUsuario(),
                        request.getPassword()
                )
        );

        Usuario usuario = usuarioRepository.findByUsuario(request.getUsuario())
                .orElseThrow(() ->
                        new RuntimeException("Usuario no encontrado"));

        String token = jwtService.generarToken(
                usuario.getUsuario(),
                usuario.getRol().name()
        );

        return new LoginResponse(
                token,
                usuario.getUsuario(),
                usuario.getNombre(),
                usuario.getRol()
        );
    }

    public RegistroResponse registrar(RegistroRequest request) {

        if (!request.getPassword().equals(request.getConfirmarPassword())) {
            throw new RuntimeException("Las contraseñas no coinciden");
        }

        if (usuarioRepository.existsByUsuario(request.getUsuario())) {
            throw new RuntimeException("El nombre de usuario ya está registrado");
        }

        if (usuarioRepository.existsByCorreo(request.getCorreo())) {
            throw new RuntimeException("El correo electrónico ya está registrado");
        }

        Usuario usuario = new Usuario();

        usuario.setNombre(request.getNombre());
        usuario.setUsuario(request.getUsuario());
        usuario.setCorreo(request.getCorreo());
        usuario.setPassword(passwordEncoder.encode(request.getPassword()));
        usuario.setRol(request.getRol());
        usuario.setActivo(true);

        Usuario usuarioGuardado = usuarioRepository.save(usuario);

        emailService.enviarCorreoRegistro(
        usuarioGuardado.getCorreo(),
        usuarioGuardado.getNombre(),
        usuarioGuardado.getUsuario()
);

        return new RegistroResponse(
                "Usuario registrado correctamente",
                usuarioGuardado.getUsuario(),
                usuarioGuardado.getNombre(),
                usuarioGuardado.getCorreo(),
                usuarioGuardado.getRol()
        );
    }
}