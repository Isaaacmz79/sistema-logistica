// =========================================================
// LOGISIS - LOGIN
// =========================================================


// =========================================================
// ELEMENTOS DEL LOGIN
// =========================================================

const loginForm =
    document.getElementById("loginForm");

const usuarioInput =
    document.getElementById("usuario");

const passwordInput =
    document.getElementById("password");

const mostrarPassword =
    document.getElementById("mostrarPassword");

const recordarSesion =
    document.getElementById("recordarSesion");

const botonLogin =
    document.getElementById("botonLogin");

const textoBoton =
    document.getElementById("textoBoton");

const mensajeError =
    document.getElementById("mensajeError");


// =========================================================
// MOSTRAR / OCULTAR CONTRASEÑA DEL LOGIN
// =========================================================

if (mostrarPassword && passwordInput) {

    mostrarPassword.addEventListener(
        "click",
        function () {

            if (
                passwordInput.type ===
                "password"
            ) {

                passwordInput.type = "text";

                mostrarPassword.textContent =
                    "🙈";

                mostrarPassword.setAttribute(
                    "aria-label",
                    "Ocultar contraseña"
                );

            } else {

                passwordInput.type =
                    "password";

                mostrarPassword.textContent =
                    "👁";

                mostrarPassword.setAttribute(
                    "aria-label",
                    "Mostrar contraseña"
                );
            }
        }
    );
}


// =========================================================
// LOGIN
// =========================================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();

            ocultarError();


            // =====================================================
            // OBTENER DATOS
            // =====================================================

            const usuario =
                usuarioInput.value.trim();

            const password =
                passwordInput.value;


            // =====================================================
            // VALIDAR CAMPOS
            // =====================================================

            if (!usuario || !password) {

                mostrarError(
                    "Por favor ingresa usuario y contraseña."
                );

                return;
            }


            // =====================================================
            // DESACTIVAR BOTÓN
            // =====================================================

            if (botonLogin) {

                botonLogin.disabled = true;
            }

            if (textoBoton) {

                textoBoton.textContent =
                    "Iniciando sesión...";
            }


            try {

                // =================================================
                // PETICIÓN AL BACKEND
                // =================================================

                const respuesta =
                    await fetch(
                        "/api/auth/login",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({
                                    usuario:
                                        usuario,

                                    password:
                                        password
                                })
                        }
                    );


                // =================================================
                // LEER RESPUESTA
                // =================================================

                const textoRespuesta =
                    await respuesta.text();

                let datos = {};


                if (textoRespuesta) {

                    try {

                        datos =
                            JSON.parse(
                                textoRespuesta
                            );

                    } catch (error) {

                        console.error(
                            "Respuesta no válida del servidor:",
                            textoRespuesta
                        );
                    }
                }


                // =================================================
                // LOGIN CORRECTO
                // =================================================

                if (respuesta.ok) {


                    // =============================================
                    // VALIDAR DATOS DEL SERVIDOR
                    // =============================================

                    if (!datos) {

                        mostrarError(
                            "El servidor no devolvió información válida."
                        );

                        return;
                    }


                    // =============================================
                    // VALIDAR TOKEN
                    // =============================================

                    if (!datos.token) {

                        mostrarError(
                            "El servidor no devolvió el token de autenticación."
                        );

                        return;
                    }


                    // =============================================
                    // VALIDAR ROL
                    // =============================================

                    if (!datos.rol) {

                        mostrarError(
                            "El servidor no devolvió el rol del usuario."
                        );

                        return;
                    }


                    // =============================================
                    // GUARDAR SESIÓN
                    // =============================================

                    if (
                        recordarSesion &&
                        recordarSesion.checked
                    ) {

                        localStorage.setItem(
                            "token",
                            datos.token
                        );

                        localStorage.setItem(
                            "usuario",
                            datos.usuario || usuario
                        );

                        localStorage.setItem(
                            "nombre",
                            datos.nombre || ""
                        );

                        localStorage.setItem(
                            "rol",
                            datos.rol
                        );


                        // Limpiar sesión temporal

                        sessionStorage.removeItem(
                            "token"
                        );

                        sessionStorage.removeItem(
                            "usuario"
                        );

                        sessionStorage.removeItem(
                            "nombre"
                        );

                        sessionStorage.removeItem(
                            "rol"
                        );

                    } else {

                        sessionStorage.setItem(
                            "token",
                            datos.token
                        );

                        sessionStorage.setItem(
                            "usuario",
                            datos.usuario || usuario
                        );

                        sessionStorage.setItem(
                            "nombre",
                            datos.nombre || ""
                        );

                        sessionStorage.setItem(
                            "rol",
                            datos.rol
                        );


                        // Limpiar sesión permanente

                        localStorage.removeItem(
                            "token"
                        );

                        localStorage.removeItem(
                            "usuario"
                        );

                        localStorage.removeItem(
                            "nombre"
                        );

                        localStorage.removeItem(
                            "rol"
                        );
                    }


                    // =============================================
                    // REDIRECCIÓN SEGÚN ROL
                    // =============================================

                    if (
                        datos.rol ===
                        "ADMINISTRADOR"
                    ) {

                        window.location.href =
                            "/admin.html";

                        return;
                    }


                    if (
                        datos.rol ===
                        "DOMICILIARIO"
                    ) {

                        window.location.href =
                            "/domiciliario.html";

                        return;
                    }


                    // =============================================
                    // ROL NO VÁLIDO
                    // =============================================

                    mostrarError(
                        "El usuario no tiene un rol válido."
                    );

                    return;
                }


                // =================================================
                // ERRORES HTTP
                // =================================================

                if (
                    respuesta.status ===
                    401
                ) {

                    mostrarError(
                        "Usuario o contraseña incorrectos."
                    );

                } else if (
                    respuesta.status ===
                    403
                ) {

                    mostrarError(
                        "No tienes autorización para acceder al sistema."
                    );

                } else if (
                    respuesta.status ===
                    404
                ) {

                    mostrarError(
                        "No se encontró el servicio de autenticación."
                    );

                } else {

                    mostrarError(
                        datos.message ||
                        datos.mensaje ||
                        "Ocurrió un error al iniciar sesión. Intenta nuevamente."
                    );
                }


            } catch (error) {

                console.error(
                    "Error de conexión:",
                    error
                );

                mostrarError(
                    "No se pudo conectar con el servidor."
                );

            } finally {

                if (botonLogin) {

                    botonLogin.disabled = false;
                }

                if (textoBoton) {

                    textoBoton.textContent =
                        "Iniciar sesión";
                }
            }
        }
    );
}


// =========================================================
// MOSTRAR ERROR
// =========================================================

function mostrarError(mensaje) {

    if (!mensajeError) {
        return;
    }

    mensajeError.textContent =
        mensaje;

    mensajeError.style.display =
        "block";
}


// =========================================================
// OCULTAR ERROR
// =========================================================

function ocultarError() {

    if (!mensajeError) {
        return;
    }

    mensajeError.textContent =
        "";

    mensajeError.style.display =
        "none";
}


// =========================================================
// OLVIDÉ MI CONTRASEÑA
// =========================================================

const olvidoPassword =
    document.getElementById(
        "olvidoPassword"
    );


if (olvidoPassword) {

    olvidoPassword.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            mostrarError(
                "La recuperación de contraseña estará disponible próximamente."
            );
        }
    );
}


// =========================================================
// INICIO DE SESIÓN CORPORATIVO - SSO
// =========================================================

const botonSSO =
    document.getElementById(
        "botonSSO"
    );


if (botonSSO) {

    botonSSO.addEventListener(
        "click",
        function () {

            mostrarError(
                "El inicio de sesión corporativo (SSO) estará disponible próximamente."
            );
        }
    );
}


// =========================================================
// ELEMENTOS DEL REGISTRO
// =========================================================

const abrirRegistro =
    document.getElementById(
        "abrirRegistro"
    );

const modalRegistro =
    document.getElementById(
        "modalRegistro"
    );

const cerrarRegistro =
    document.getElementById(
        "cerrarRegistro"
    );

const registroForm =
    document.getElementById(
        "registroForm"
    );

const mensajeRegistro =
    document.getElementById(
        "mensajeRegistro"
    );

const registroPassword =
    document.getElementById(
        "registroPassword"
    );

const registroConfirmarPassword =
    document.getElementById(
        "registroConfirmarPassword"
    );


// =========================================================
// ELEMENTOS DE REQUISITOS
// =========================================================

const requisitoLongitud =
    document.getElementById(
        "requisitoLongitud"
    );

const requisitoMayuscula =
    document.getElementById(
        "requisitoMayuscula"
    );

const requisitoMinuscula =
    document.getElementById(
        "requisitoMinuscula"
    );

const requisitoNumero =
    document.getElementById(
        "requisitoNumero"
    );

const requisitoSimbolo =
    document.getElementById(
        "requisitoSimbolo"
    );

const requisitoSinEspacios =
    document.getElementById(
        "requisitoSinEspacios"
    );

const confirmacionPassword =
    document.getElementById(
        "confirmacionPassword"
    );


// =========================================================
// ABRIR REGISTRO
// =========================================================

if (
    abrirRegistro &&
    modalRegistro
) {

    abrirRegistro.addEventListener(
        "click",
        function (event) {

            event.preventDefault();

            modalRegistro.style.display =
                "flex";

            limpiarValidacionPassword();
        }
    );
}


// =========================================================
// CERRAR REGISTRO
// =========================================================

if (
    cerrarRegistro &&
    modalRegistro &&
    registroForm
) {

    cerrarRegistro.addEventListener(
        "click",
        function () {

            cerrarModalRegistro();
        }
    );
}


// =========================================================
// CERRAR AL HACER CLICK FUERA
// =========================================================

if (
    modalRegistro &&
    registroForm
) {

    modalRegistro.addEventListener(
        "click",
        function (event) {

            if (
                event.target ===
                modalRegistro
            ) {

                cerrarModalRegistro();
            }
        }
    );
}


// =========================================================
// FUNCIÓN CERRAR MODAL
// =========================================================

function cerrarModalRegistro() {

    if (modalRegistro) {

        modalRegistro.style.display =
            "none";
    }


    if (registroForm) {

        registroForm.reset();
    }


    if (mensajeRegistro) {

        mensajeRegistro.style.display =
            "none";

        mensajeRegistro.textContent =
            "";
    }


    limpiarValidacionPassword();
}


// =========================================================
// VALIDACIÓN EN TIEMPO REAL
// SOLO REGISTRO
// =========================================================

if (registroPassword) {

    registroPassword.addEventListener(
        "input",
        function () {

            validarPasswordVisual();
        }
    );
}


// =========================================================
// CONFIRMACIÓN DE CONTRASEÑA
// =========================================================

if (registroConfirmarPassword) {

    registroConfirmarPassword.addEventListener(
        "input",
        function () {

            validarConfirmacionPassword();
        }
    );
}


// =========================================================
// VALIDAR CONTRASEÑA
// =========================================================

function validarPassword(password) {

    return {

        longitud:
            password.length >= 8,

        mayuscula:
            /[A-Z]/.test(password),

        minuscula:
            /[a-z]/.test(password),

        numero:
            /[0-9]/.test(password),

        simbolo:
            /[!@#$%^&*(),.?":{}|<>\_\-+=;'`~[\]\\]/.test(
                password
            ),

        sinEspacios:
            !/\s/.test(password)
    };
}


// =========================================================
// ACTUALIZAR REQUISITO
// =========================================================

function actualizarRequisito(
    elemento,
    valido
) {

    if (!elemento) {
        return;
    }


    const texto =
        elemento.dataset.texto;


    // Evitar undefined

    if (!texto) {
        return;
    }


    if (valido) {

        elemento.classList.add(
            "valido"
        );

        elemento.classList.remove(
            "invalido"
        );

        elemento.textContent =
            "✓ " + texto;

    } else {

        elemento.classList.add(
            "invalido"
        );

        elemento.classList.remove(
            "valido"
        );

        elemento.textContent =
            "✕ " + texto;
    }
}


// =========================================================
// VALIDACIÓN VISUAL DE CONTRASEÑA
// =========================================================

function validarPasswordVisual() {

    if (!registroPassword) {
        return;
    }


    const password =
        registroPassword.value;


    const validacion =
        validarPassword(password);


    actualizarRequisito(
        requisitoLongitud,
        validacion.longitud
    );


    actualizarRequisito(
        requisitoMayuscula,
        validacion.mayuscula
    );


    actualizarRequisito(
        requisitoMinuscula,
        validacion.minuscula
    );


    actualizarRequisito(
        requisitoNumero,
        validacion.numero
    );


    actualizarRequisito(
        requisitoSimbolo,
        validacion.simbolo
    );


    actualizarRequisito(
        requisitoSinEspacios,
        validacion.sinEspacios
    );


    validarConfirmacionPassword();
}


// =========================================================
// VALIDAR CONFIRMACIÓN
// =========================================================

function validarConfirmacionPassword() {

    if (
        !registroPassword ||
        !registroConfirmarPassword ||
        !confirmacionPassword
    ) {

        return;
    }


    const password =
        registroPassword.value;


    const confirmar =
        registroConfirmarPassword.value;


    // =============================================
    // TODAVÍA NO ESCRIBE
    // =============================================

    if (!confirmar) {

        confirmacionPassword.textContent =
            "";

        confirmacionPassword.className =
            "validacion-confirmacion";

        return;
    }


    // =============================================
    // COINCIDEN
    // =============================================

    if (
        password ===
        confirmar
    ) {

        confirmacionPassword.textContent =
            "✓ Las contraseñas coinciden";

        confirmacionPassword.className =
            "validacion-confirmacion valido";

    } else {

        confirmacionPassword.textContent =
            "✕ Las contraseñas no coinciden";

        confirmacionPassword.className =
            "validacion-confirmacion invalido";
    }
}


// =========================================================
// LIMPIAR VALIDACIÓN
// =========================================================

function limpiarValidacionPassword() {

    const requisitos = [

        requisitoLongitud,
        requisitoMayuscula,
        requisitoMinuscula,
        requisitoNumero,
        requisitoSimbolo,
        requisitoSinEspacios

    ];


    requisitos.forEach(
        function (elemento) {

            if (!elemento) {
                return;
            }


            elemento.classList.remove(
                "valido"
            );

            elemento.classList.add(
                "invalido"
            );


            const texto =
                elemento.dataset.texto;


            if (texto) {

                elemento.textContent =
                    "✕ " + texto;
            }
        }
    );


    if (confirmacionPassword) {

        confirmacionPassword.textContent =
            "";

        confirmacionPassword.className =
            "validacion-confirmacion";
    }
}


// =========================================================
// REGISTRO DE USUARIO
// =========================================================

if (registroForm) {

    registroForm.addEventListener(
        "submit",
        async function (event) {

            event.preventDefault();


            // =================================================
            // OBTENER CAMPOS
            // =================================================

            const nombreInput =
                document.getElementById(
                    "registroNombre"
                );

            const usuarioRegistroInput =
                document.getElementById(
                    "registroUsuario"
                );

            const correoInput =
                document.getElementById(
                    "registroCorreo"
                );

            const rolInput =
                document.getElementById(
                    "registroRol"
                );


            const nombre =
                nombreInput
                    ? nombreInput.value.trim()
                    : "";

            const usuario =
                usuarioRegistroInput
                    ? usuarioRegistroInput.value.trim()
                    : "";

            const correo =
                correoInput
                    ? correoInput.value.trim()
                    : "";

            const password =
                registroPassword
                    ? registroPassword.value
                    : "";

            const confirmarPassword =
                registroConfirmarPassword
                    ? registroConfirmarPassword.value
                    : "";

            const rol =
                rolInput
                    ? rolInput.value
                    : "DOMICILIARIO";


            // =================================================
            // LIMPIAR MENSAJE
            // =================================================

            if (mensajeRegistro) {

                mensajeRegistro.style.display =
                    "none";

                mensajeRegistro.textContent =
                    "";
            }


            // =================================================
            // VALIDAR CONTRASEÑA
            // =================================================

            const validacion =
                validarPassword(password);


            const passwordSegura =
                validacion.longitud &&
                validacion.mayuscula &&
                validacion.minuscula &&
                validacion.numero &&
                validacion.simbolo &&
                validacion.sinEspacios;


            if (!passwordSegura) {

                if (mensajeRegistro) {

                    mensajeRegistro.textContent =
                        "La contraseña no cumple todos los requisitos de seguridad.";

                    mensajeRegistro.style.display =
                        "block";
                }

                return;
            }


            // =================================================
            // CONFIRMAR CONTRASEÑA
            // =================================================

            if (
                password !==
                confirmarPassword
            ) {

                if (mensajeRegistro) {

                    mensajeRegistro.textContent =
                        "Las contraseñas no coinciden.";

                    mensajeRegistro.style.display =
                        "block";
                }

                return;
            }


            // =================================================
            // ENVIAR REGISTRO
            // =================================================

            try {

                const respuesta =
                    await fetch(
                        "/api/auth/registro",
                        {
                            method: "POST",

                            headers: {
                                "Content-Type":
                                    "application/json"
                            },

                            body:
                                JSON.stringify({

                                    nombre:
                                        nombre,

                                    usuario:
                                        usuario,

                                    correo:
                                        correo,

                                    password:
                                        password,

                                    confirmarPassword:
                                        confirmarPassword,

                                    rol:
                                        rol

                                })
                        }
                    );


                // =================================================
                // LEER RESPUESTA
                // =================================================

                const textoRespuesta =
                    await respuesta.text();


                let datos = {};


                if (textoRespuesta) {

                    try {

                        datos =
                            JSON.parse(
                                textoRespuesta
                            );

                    } catch (error) {

                        console.error(
                            "Respuesta no válida del servidor:",
                            textoRespuesta
                        );
                    }
                }


                // =================================================
                // ERROR DEL SERVIDOR
                // =================================================

                if (!respuesta.ok) {

                    throw new Error(
                        datos.message ||
                        datos.mensaje ||
                        "No fue posible registrar el usuario."
                    );
                }


                // =================================================
                // REGISTRO CORRECTO
                // =================================================

                alert(
                    "Usuario registrado correctamente. " +
                    "Se ha enviado un correo de confirmación."
                );


                registroForm.reset();


                limpiarValidacionPassword();


                if (modalRegistro) {

                    modalRegistro.style.display =
                        "none";
                }


            } catch (error) {

                console.error(
                    "Error durante el registro:",
                    error
                );


                if (mensajeRegistro) {

                    mensajeRegistro.textContent =
                        error.message ||
                        "No fue posible registrar el usuario.";

                    mensajeRegistro.style.display =
                        "block";
                }
            }
        }
    );
}