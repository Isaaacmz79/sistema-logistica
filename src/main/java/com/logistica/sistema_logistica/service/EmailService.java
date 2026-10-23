package com.logistica.sistema_logistica.service;

import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void enviarCorreoRegistro(
            String correo,
            String nombre,
            String usuario) {

        SimpleMailMessage mensaje = new SimpleMailMessage();

        mensaje.setTo(correo);

        mensaje.setSubject("Registro exitoso - LogiSIS");

        mensaje.setText(
                "Hola " + nombre + ",\n\n" +
                "Tu cuenta de domiciliario ha sido registrada " +
                "correctamente en LogiSIS.\n\n" +

                "Datos de tu cuenta:\n" +
                "Usuario: " + usuario + "\n" +
                "Rol: DOMICILIARIO\n\n" +

                "Ya puedes ingresar al sistema utilizando " +
                "las credenciales que registraste.\n\n" +

                "Saludos,\n" +
                "Equipo LogiSIS"
        );

        mailSender.send(mensaje);
    }
}