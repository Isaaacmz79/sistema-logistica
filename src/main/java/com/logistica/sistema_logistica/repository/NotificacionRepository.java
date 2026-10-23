package com.logistica.sistema_logistica.repository;

import com.logistica.sistema_logistica.model.Notificacion;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;

public interface NotificacionRepository extends MongoRepository<Notificacion, String> {

    List<Notificacion> findTop30ByUsuarioOrderByFechaDesc(String usuario);

    List<Notificacion> findByUsuarioAndLeidaFalse(String usuario);
}
