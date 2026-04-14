let metodoPagoSeleccionado = "";
const ALIAS_CVU = "EJEMPLO.MP";
let map, marker;
const origenEnvio = { lat: -32.9906023735748, lng: -68.79403612209713 };
let deliveryFee = 0;

function renderizarCarrito() {
    const lista = document.getElementById('lista-carrito');
    const totalElement = document.getElementById('total-carrito');
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    
    lista.innerHTML = "";
    let totalAcumulado = 0;

    carrito.forEach((item, index) => {
        let precioLimpio = item.precio.replace('$', '').replace(/\s/g, '').replace(/,/g, '').trim();
        let precioBase = parseFloat(precioLimpio);
        
        // SUMAR PRECIOS DE EXTRAS
        let sumaExtras = 0;
        if (Array.isArray(item.extras)) {
            sumaExtras = item.extras.reduce((acc, extra) => acc + (extra.precio || 0), 0);
        }

        let valorIndividualTotal = (precioBase + sumaExtras) * (item.cantidad || 1);

        if (!isNaN(valorIndividualTotal)) {
            totalAcumulado += valorIndividualTotal;
        }

        const textoExtras = Array.isArray(item.extras) 
            ? item.extras.map(e => e.nombre).join(', ') 
            : (item.extras || 'Ninguno');

        const div = document.createElement('div');
        div.className = 'item-carrito';
        div.innerHTML = `
            <img src="${item.imagen}" width="50" style="border-radius: 5px; object-fit: cover;">
            <div class="item-info">
                <p><strong>(${item.cantidad || 1}x) ${item.nombre}</strong></p>
                <p style="font-size: 17px; color: #aaaaaa; margin: 3px 0;">Opciones: ${item.opciones || 'No seleccionado'}</p>
                <p style="font-size: 17px; color: #aaaaaa; margin: 3px 0;">Extras: ${textoExtras}</p>
                <p><strong>$${valorIndividualTotal.toLocaleString('es-AR')}</strong></p>
            </div>
            <button class="btn-eliminar" onclick="eliminarDelCarrito(${index})" style="color:#d4d4d4;">✕</button>
        `;
        lista.appendChild(div);
    });

    totalElement.textContent = totalAcumulado.toLocaleString('es-AR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

function calcularTotalCarrito() {
    const carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    return carrito.reduce((acum, item) => {
        const precioLimpio = item.precio.replace('$', '').replace(/\s/g, '').replace(/,/g, '').trim();
        const precioBase = parseFloat(precioLimpio) || 0;
        const sumaExtras = Array.isArray(item.extras) ? item.extras.reduce((acc, extra) => acc + (extra.precio || 0), 0) : 0;
        return acum + (precioBase + sumaExtras) * (item.cantidad || 1);
    }, 0);
}

function calcularDistanciaKm(origen, destino) {
    const toRad = (value) => (value * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(destino.lat - origen.lat);
    const dLon = toRad(destino.lng - origen.lng);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(origen.lat)) * Math.cos(toRad(destino.lat)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function calcularCostoEntrega(distanciaKm) {
    if (distanciaKm <= 2) return 3000;
    if (distanciaKm <= 5) return 5500;
    if (distanciaKm <= 10) return 8000;
    return 10500;
}

function actualizarCostoEntrega() {
    const label = document.getElementById('costo-entrega');
    if (!label) return;
    if (deliveryFee > 0) {
        label.textContent = `Costo de envío: $${deliveryFee.toLocaleString('es-AR')}`;
    } else {
        label.textContent = 'Costo de envío: pendiente';
    }
}

function enviarPedidoWhatsApp() {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    if (carrito.length === 0) {
        if (typeof mostrarToast === 'function') mostrarToast("El carrito está vacío");
        else alert("El carrito está vacío");
        return;
    }
    const modal = document.getElementById('modal-pago');
    if (modal) modal.style.display = 'flex';
}

document.addEventListener('click', (e) => {
    if (e.target.id === 'pago-efectivo') {
        metodoPagoSeleccionado = "Efectivo";
        ejecutarEnvioFinal();
    }
    if (e.target.id === 'pago-transferencia') {
        metodoPagoSeleccionado = "Transferencia";
        document.getElementById('bloque-alias').style.display = 'block';
        document.getElementById('finalizar-con-pago').style.display = 'block';
        document.getElementById('alias-texto').textContent = ALIAS_CVU;
    }
    if (e.target.id === 'btn-copiar-alias') {
        navigator.clipboard.writeText(ALIAS_CVU);
        const btn = e.target;
        const textoOriginal = btn.textContent;
        btn.textContent = "¡COPIADO!";
        btn.style.backgroundColor = "#e8f5e9";
        btn.style.color = "#2e7d32";
        btn.style.borderColor = "#2e7d32";

        const aviso = document.createElement('div');
        aviso.textContent = "Alias copiado al portapapeles";
        Object.assign(aviso.style, {
            position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)',
            backgroundColor: '#333', color: '#fff', padding: '10px 20px', borderRadius: '50px',
            fontSize: '13px', zIndex: '3000', boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
            animation: 'fadeInOut 2s ease forwards'
        });

        if (!document.getElementById('style-animacion-copy')) {
            const styleSheet = document.createElement("style");
            styleSheet.id = 'style-animacion-copy';
            styleSheet.innerText = `@keyframes fadeInOut {0%{opacity:0;transform:translate(-50%,-10px);}20%{opacity:1;transform:translate(-50%,0);}80%{opacity:1;}100%{opacity:0;}}`;
            document.head.appendChild(styleSheet);
        }
        document.body.appendChild(aviso);
        setTimeout(() => {
            btn.textContent = textoOriginal;
            btn.style.backgroundColor = "transparent"; btn.style.color = "#007bff";
            btn.style.borderColor = "#007bff"; aviso.remove();
        }, 2000);
    }
    if (e.target.id === 'finalizar-con-pago') { ejecutarEnvioFinal(); }
});

function ejecutarEnvioFinal() {
    const nombreCliente = document.getElementById('nombre-cliente').value.trim();
    if (!nombreCliente) {
        if (typeof mostrarToast === 'function') mostrarToast("Por favor, ingresa tu nombre");
        else alert("Por favor, ingresa tu nombre");
        return;
    }
    // Ocultar modal-pago y mostrar modal-entrega
    document.getElementById('modal-pago').style.display = 'none';
    document.getElementById('modal-entrega').style.display = 'flex';
}

function eliminarDelCarrito(index) {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    carrito.splice(index, 1);
    localStorage.setItem('carrito', JSON.stringify(carrito));
    renderizarCarrito();
    actualizarContador();
}

function actualizarContador() {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const contador = document.getElementById('carrito-count');
    const iconoCarrito = document.querySelector('.icono-carrito');
    if (contador) contador.textContent = carrito.length;
    if (iconoCarrito) {
        if (carrito.length > 0) {
            iconoCarrito.classList.add('palpitando');
        } else {
            iconoCarrito.classList.remove('palpitando');
        }
    }
}

function toggleCarrito() {
    const cart = document.getElementById('modal-carrito');
    if (cart) { cart.classList.toggle('activo'); renderizarCarrito(); }
}

function enviarPedidoWhatsAppFinal(tipoEntrega, linkMaps = '', direccion = '') {
    let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
    const num = "5492615783000"; 
    const nombreCliente = document.getElementById('nombre-cliente').value.trim();
    let mensaje = "¡Hola! Quisiera realizar este pedido de La Reina del Norte:%0A%0A";
    
    carrito.forEach(item => {
        let precioLimpio = item.precio.replace('$', '').replace(/\s/g, '').replace(/,/g, '').trim();
        let precioBase = parseFloat(precioLimpio);
        let sumaExtras = Array.isArray(item.extras) ? item.extras.reduce((acc, extra) => acc + (extra.precio || 0), 0) : 0;
        let subtotal = (precioBase + sumaExtras) * (item.cantidad || 1);
        const textoExtras = Array.isArray(item.extras) ? item.extras.map(e => e.nombre).join(', ') : item.extras;
        
        mensaje += `• *(${item.cantidad || 1}x) ${item.nombre}*%0A`;
        mensaje += `  Opciones: ${item.opciones}%0A`;
        mensaje += `  Extras: ${textoExtras}%0A`;
        mensaje += `  Subtotal: $${subtotal.toLocaleString('es-AR')}%0A%0A`;
    });

    mensaje += `*Método de Pago:* ${metodoPagoSeleccionado}%0A`;
    mensaje += `*Tipo de Entrega:* ${tipoEntrega}%0A`;
    if (direccion) mensaje += `*Dirección:* ${direccion}%0A`;
    if (linkMaps) mensaje += `*Ubicación en Maps:* ${linkMaps}%0A`;
    if (tipoEntrega === 'Entrega en domicilio' && deliveryFee > 0) {
        mensaje += `*Costo de envío:* $${deliveryFee.toLocaleString('es-AR')}%0A`;
    }
    const totalCarrito = calcularTotalCarrito();
    const totalFinal = totalCarrito + (tipoEntrega === 'Entrega en domicilio' ? deliveryFee : 0);
    mensaje += `*TOTAL:* $${totalFinal.toLocaleString('es-AR')} ARG%0A`;
    mensaje += `*Mi nombre es:* ${nombreCliente}`;
    
    window.open(`https://wa.me/${num}?text=${mensaje}`, '_blank');
    // Limpiar carrito
    localStorage.setItem('carrito', JSON.stringify([]));
    actualizarContador();
    // Cerrar modales
    document.getElementById('modal-entrega').style.display = 'none';
    document.getElementById('modal-mapa').style.display = 'none';
    document.getElementById('modal-pago').style.display = 'none';
}

document.addEventListener('DOMContentLoaded', actualizarContador);

// Nuevos event listeners para entrega
document.getElementById('entrega-local').addEventListener('click', () => {
    enviarPedidoWhatsAppFinal('Retiro en local');
});

document.getElementById('entrega-domicilio').addEventListener('click', () => {
    deliveryFee = 0;
    actualizarCostoEntrega();
    document.getElementById('modal-entrega').style.display = 'none';
    document.getElementById('modal-mapa').style.display = 'flex';
    // Inicializar mapa si no está inicializado y google.maps está disponible
    if (!map && typeof google !== 'undefined' && google.maps) {
        initMap();
    } else if (!map) {
        // Si no está listo, intentar en un timeout
        setTimeout(() => {
            if (typeof google !== 'undefined' && google.maps) {
                initMap();
            } else {
                if (typeof mostrarToast === 'function') mostrarToast("Error cargando el mapa. Intenta de nuevo.");
            }
        }, 1000);
    }
});

document.getElementById('usar-ubicacion-actual').addEventListener('click', () => {
    const button = document.getElementById('usar-ubicacion-actual');
    if (navigator.geolocation) {
        button.disabled = true;
        button.textContent = 'Cargando...';
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            const pos = { lat, lng };
            map.setCenter(pos);
            if (marker) {
                marker.setPosition(pos);
            } else {
                marker = new google.maps.Marker({
                    position: pos,
                    map: map,
                });
            }
            document.getElementById('direccion-cliente').value = `Ubicación actual: ${lat.toFixed(6)}, ${lng.toFixed(6)}`;
            deliveryFee = calcularCostoEntrega(calcularDistanciaKm(origenEnvio, pos));
            actualizarCostoEntrega();
            button.disabled = false;
            button.textContent = 'USAR MI UBICACIÓN ACTUAL';
            if (typeof mostrarToast === 'function') mostrarToast("Ubicación obtenida correctamente");
        }, (error) => {
            console.error('Error obteniendo ubicación:', error);
            button.disabled = false;
            button.textContent = 'USAR MI UBICACIÓN ACTUAL';
            if (typeof mostrarToast === 'function') mostrarToast("No se pudo obtener la ubicación. Verifica los permisos.");
            else alert("No se pudo obtener la ubicación. Verifica los permisos.");
        });
    } else {
        if (typeof mostrarToast === 'function') mostrarToast("Geolocalización no soportada en este navegador");
        else alert("Geolocalización no soportada en este navegador");
    }
});

document.getElementById('confirmar-ubicacion').addEventListener('click', () => {
    let linkMaps = '';
    let direccion = '';
    if (marker) {
        const position = marker.getPosition();
        linkMaps = `https://www.google.com/maps?q=${position.lat()},${position.lng()}`;
        direccion = `Ubicación seleccionada: ${position.lat().toFixed(6)}, ${position.lng().toFixed(6)}`;
    } else {
        if (typeof mostrarToast === 'function') mostrarToast("Por favor, selecciona una ubicación en el mapa");
        else alert("Por favor, selecciona una ubicación en el mapa");
        return;
    }
    enviarPedidoWhatsAppFinal('Entrega en domicilio', linkMaps, direccion);
});

function initMap() {
    if (typeof google === 'undefined' || !google.maps) {
        console.error('Google Maps API no cargada');
        return;
    }
    const maipu = { lat: -32.8902, lng: -68.8005 };
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 12,
        center: maipu,
    });
    map.addListener('click', (event) => {
        if (marker) {
            marker.setPosition(event.latLng);
        } else {
            marker = new google.maps.Marker({
                position: event.latLng,
                map: map,
            });
        }
        const destino = { lat: event.latLng.lat(), lng: event.latLng.lng() };
        deliveryFee = calcularCostoEntrega(calcularDistanciaKm(origenEnvio, destino));
        actualizarCostoEntrega();
        document.getElementById('direccion-cliente').value = `Ubicación seleccionada: ${event.latLng.lat().toFixed(6)}, ${event.latLng.lng().toFixed(6)}`;
    });
}