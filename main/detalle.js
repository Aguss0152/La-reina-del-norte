document.addEventListener('DOMContentLoaded', () => {
    const producto = JSON.parse(localStorage.getItem('productoSeleccionado'));
    let salsasSeleccionadas = []; 
    let extrasSeleccionados = []; 
    let cantidad = 1;
    const URL_SPREADSHEET = window.APP_CONFIG?.SHEET_URL || '<REPLACE_WITH_GOOGLE_SHEETS_CSV_URL>';

    if (!producto) {
        window.location.href = '../index.html';
        return;
    }

    // 1. Cargar datos básicos
    document.getElementById('titulo-detalle').textContent = producto.nombre;
    document.getElementById('precio-detalle').textContent = `${producto.precio} ARG`;
    document.getElementById('img-detalle').src = producto.imagen;
    document.getElementById('descripcion-detalle').textContent = producto.descripcion || "Sin descripción.";

    // 2. Selector de Cantidad
    const btnMenos = document.getElementById('btn-menos');
    const btnMas = document.getElementById('btn-mas');
    const cantidadTxt = document.getElementById('cantidad-numero');

    btnMenos.onclick = () => { if(cantidad > 1) { cantidad--; cantidadTxt.textContent = cantidad; } };
    btnMas.onclick = () => { cantidad++; cantidadTxt.textContent = cantidad; };

    // 3. Renderizar Chips (Opciones y Extras con lógica de precios)
    function crearChips(datos, contenedorId, esOpcionPrincipal) {
        const contenedor = document.getElementById(contenedorId);
        if(!contenedor) return;
        contenedor.innerHTML = "";
        
        // SEPARA POR LA BARRA /
        const lista = datos.split('/').map(t => t.trim()).filter(t => t !== "");
        
        lista.forEach(itemStr => {
            const partes = itemStr.split('+');
            const nombre = partes[0];
            const precioExtra = partes[1] ? parseFloat(partes[1]) : 0;

            const span = document.createElement('span');
            span.className = 'chip-detalle';
            // Muestra el nombre y el precio si lo tiene
            span.textContent = precioExtra > 0 ? `${nombre} (+$${precioExtra})` : nombre;
            
            span.onclick = () => {
                const esCompleto = nombre.toLowerCase() === "completo";
                if (esOpcionPrincipal && esCompleto) {
                    salsasSeleccionadas = [nombre];
                    document.querySelectorAll(`#${contenedorId} .chip-detalle`).forEach(c => c.classList.remove('seleccionado'));
                    span.classList.add('seleccionado');
                } else {
                    if (esOpcionPrincipal) {
                        salsasSeleccionadas = salsasSeleccionadas.filter(s => s.toLowerCase() !== "completo");
                        document.querySelectorAll(`#${contenedorId} .chip-detalle`).forEach(c => {
                            if(c.textContent.toLowerCase().includes("completo")) c.classList.remove('seleccionado');
                        });
                    }
                    if (span.classList.contains('seleccionado')) {
                        span.classList.remove('seleccionado');
                        if(esOpcionPrincipal) salsasSeleccionadas = salsasSeleccionadas.filter(i => i !== nombre);
                        else extrasSeleccionados = extrasSeleccionados.filter(i => i.nombre !== nombre);
                    } else {
                        span.classList.add('seleccionado');
                        if(esOpcionPrincipal) salsasSeleccionadas.push(nombre);
                        else extrasSeleccionados.push({ nombre: nombre, precio: precioExtra });
                    }
                }
            };
            contenedor.appendChild(span);
        });
    }

    crearChips(producto.talles, 'contenedor-salsas', true);
    crearChips(producto.extras, 'contenedor-extras', false);

    // 4. Agregar al Carrito
    document.getElementById('agregar-carrito').onclick = () => {
        let carrito = JSON.parse(localStorage.getItem('carrito')) || [];
        
        carrito.push({
            nombre: producto.nombre,
            precio: producto.precio,
            opciones: salsasSeleccionadas.join(', ') || "Estándar",
            extras: extrasSeleccionados, // Guardamos array de objetos con precio
            cantidad: cantidad,
            imagen: producto.imagen
        });

        localStorage.setItem('carrito', JSON.stringify(carrito));
        mostrarToast(`¡${producto.nombre} agregado al carrito!`);

        // Limpieza
        salsasSeleccionadas = [];
        extrasSeleccionados = [];
        cantidad = 1;
        cantidadTxt.textContent = "1";
        document.querySelectorAll('.chip-detalle').forEach(c => c.classList.remove('seleccionado'));
    };

    // 5. Botón Directo WhatsApp
    document.getElementById('comprar-producto').onclick = () => {
        const numero = "5492615783000";
        const nombresExtras = extrasSeleccionados.map(e => e.nombre).join(', ') || "Ninguno";
        const seleccion = `Opciones: ${salsasSeleccionadas.join(', ') || "Estándar"} | Extras: ${nombresExtras}`;
        
        // Calcular precio total incluyendo extras
        const precioBase = parseFloat(producto.precio.replace(/[^\d.]/g, '')) || 0;
        const sumaExtras = extrasSeleccionados.reduce((acc, e) => acc + (e.precio || 0), 0);
        const precioUnitario = precioBase + sumaExtras;
        const precioTotal = precioUnitario * cantidad;
        
        const msg = `¡Hola! Quiero: *(${cantidad}x) ${producto.nombre}*\nDetalles: ${seleccion}\nPrecio Total: $${precioTotal.toLocaleString('es-AR')} ARG`;
        window.open(`https://wa.me/${numero}?text=${encodeURIComponent(msg)}`, '_blank');
    };

    cargarSugeridos();
});

function mostrarToast(mensaje) {
    const toast = document.createElement('div');
    toast.textContent = mensaje;
    Object.assign(toast.style, {
        position: 'fixed', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
        backgroundColor: '#333', color: '#fff', padding: '12px 24px', borderRadius: '8px', zIndex: '1000', fontSize: '14px'
    });
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 2500);
}

function parseCSVRow(row) {
    return row.split(/,(?=(?:(?:[^\"]*\"){2})*[^\"]*$)/).map(c => c.replace(/\"/g, "").trim());
}

function formatearLinkImagen(link) {
    if (!link) return 'https://via.placeholder.com/300';
    link = link.trim();
    if (link.includes('drive.google.com')) {
        const match = link.match(/\/d\/(.+?)\//) || link.match(/id=(.+?)(&|$)/);
        return match ? `https://wsrv.nl/?url=https://drive.google.com/uc?id=${match[1]}` : link;
    }
    return link;
}

async function fetchBebidasPorRango(inicioFila, finFila) {
    try {
        const respuesta = await fetch(URL_SPREADSHEET);
        const data = await respuesta.text();
        const lineas = data.split(/\r?\n/);
        const bebidas = [];
        for (let index = inicioFila - 1; index < finFila && index < lineas.length; index++) {
            const fila = lineas[index];
            if (!fila || fila.trim().length === 0) continue;
            const columnas = parseCSVRow(fila);
            const nombre = (columnas[0] || '').trim();
            const precioRaw = (columnas[1] || '').trim();
            if (!nombre || !precioRaw || isNaN(precioRaw.replace(/[$. ,]/g, ''))) continue;
            bebidas.push({
                nombre,
                precio: precioRaw,
                imagen: formatearLinkImagen(columnas[5] ? columnas[5].split(',')[0] : ""),
                imagenes: columnas[5] ? columnas[5].split(',').map(l => formatearLinkImagen(l)) : [],
                talles: columnas[2] || "",
                descripcion: columnas[3] || "",
                extras: columnas[4] || "",
                categoria: 'Bebidas'
            });
        }
        localStorage.setItem('bebidasCatalogo', JSON.stringify(bebidas));
        return bebidas;
    } catch (e) {
        console.error('No se pudo cargar el catálogo de bebidas:', e);
        return [];
    }
}

async function cargarSugeridos() {
    const actual = JSON.parse(localStorage.getItem('productoSeleccionado'));
    const contenedor = document.getElementById('contenedor-otros-productos');
    if (!contenedor || !actual) return;
    let origen = JSON.parse(localStorage.getItem('bebidasCatalogo')) || [];
    if (!origen.length) {
        origen = await fetchBebidasPorRango(75, 90);
    }
    const filtrados = origen.filter(p => p.nombre !== actual.nombre).slice(0, 10);
    contenedor.innerHTML = "";
    filtrados.forEach(prod => {
        const item = document.createElement('div');
        item.className = 'item-sugerido';
        item.innerHTML = `<img src="${prod.imagen}"><div class="info-sugerido"><p>${prod.nombre}</p><b>${prod.precio}</b></div>`;
        item.onclick = () => { localStorage.setItem('productoSeleccionado', JSON.stringify(prod)); window.location.reload(); };
        contenedor.appendChild(item);
    });
}
