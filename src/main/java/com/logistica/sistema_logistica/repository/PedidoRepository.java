package com.logistica.sistema_logistica.repository;

import com.logistica.sistema_logistica.model.Pedido;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;

public interface PedidoRepository extends MongoRepository<Pedido, String> {

    Optional<Pedido> findByGuia(String guia);

    boolean existsByGuia(String guia);

    List<Pedido> findByDomiciliarioOrderByFechaCreacionAsc(String domiciliario);

    Optional<Pedido> findByIdAndDomiciliario(String id, String domiciliario);

    boolean existsByDomiciliario(String domiciliario);
}
