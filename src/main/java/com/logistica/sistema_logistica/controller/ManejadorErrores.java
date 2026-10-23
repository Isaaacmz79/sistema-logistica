package com.logistica.sistema_logistica.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;

@RestControllerAdvice
public class ManejadorErrores {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, String>> manejar(
            ResponseStatusException excepcion) {

        String mensaje = excepcion.getReason() == null
                ? "Ocurrió un error inesperado"
                : excepcion.getReason();

        return ResponseEntity
                .status(excepcion.getStatusCode())
                .body(Map.of("message", mensaje));
    }
}
