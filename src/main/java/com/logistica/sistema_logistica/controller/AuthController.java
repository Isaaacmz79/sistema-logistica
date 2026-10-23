package com.logistica.sistema_logistica.controller;

import com.logistica.sistema_logistica.dto.LoginRequest;
import com.logistica.sistema_logistica.dto.LoginResponse;
import com.logistica.sistema_logistica.dto.RegistroRequest;
import com.logistica.sistema_logistica.dto.RegistroResponse;
import com.logistica.sistema_logistica.service.AuthService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    // ==========================================
    // LOGIN
    // ==========================================

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(
            @RequestBody LoginRequest request) {

        LoginResponse response = authService.login(request);

        return ResponseEntity.ok(response);
    }


    // ==========================================
    // REGISTRO
    // ==========================================

    @PostMapping("/registro")
    public ResponseEntity<RegistroResponse> registrar(
            @RequestBody RegistroRequest request) {

        RegistroResponse response =
                authService.registrar(request);

        return ResponseEntity.ok(response);
    }
}