let modeloIA;
const spinner = document.getElementById('spinner');
const barra = document.getElementById('barraProgreso');
const barraInner = barra.querySelector('div');
const estadoModelo = document.getElementById('estadoModelo');

// ==================== FUNCIONES DE CLASIFICACIÓN ====================
function colorPorConsumo(valor) {
  if (valor <= 13.33) return 'rgba(54, 235, 54, 0.6)'; // verde
  if (valor <= 20) return 'rgba(235, 235, 54, 0.6)';  // amarillo
  return 'rgba(235, 54, 54, 0.6)';                     // rojo
}

function mensajeConsumo(valor) {
  if (valor <= 13.33) return "Consumo bajo ✅";
  if (valor <= 20) return "Consumo medio ⚠️";
  return "Consumo alto ❌";
}

// ==================== API DE GEOLOCALIZACIÓN ====================
async function obtenerCoordenadas(ciudad) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1`;
    const respuesta = await fetch(url);
    const datos = await respuesta.json();

    if (datos.results && datos.results.length > 0) {
      const { latitude, longitude, name, country } = datos.results[0];
      return { lat: latitude, lon: longitude, nombre: `${name}, ${country}` };
    } else return null;
  } catch (error) {
    console.error("Error al obtener coordenadas:", error);
    return null;
  }
}

// ==================== API DE CLIMA ====================
async function obtenerTemperatura(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    return datos.current_weather?.temperature ?? null;
  } catch (error) {
    console.error("Error al obtener datos del clima:", error);
    return null;
  }
}

async function obtenerTemperaturaPronostico(lat, lon, dia) {
  const hoy = new Date();
  const fecha = new Date(hoy.getTime() + (dia - 1) * 24 * 60 * 60 * 1000);
  const fechaStr = fecha.toISOString().split('T')[0];

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&start_date=${fechaStr}&end_date=${fechaStr}&timezone=America/Argentina/Buenos_Aires`;
  const res = await fetch(url);
  const data = await res.json();

  if (!data.hourly || !data.hourly.temperature_2m) {
    console.error("No hay datos de temperatura disponibles para esta fecha:", fechaStr);
    return 20; // valor por defecto
  }

  return data.hourly.temperature_2m[12]; // temperatura mediodía
}

// ==================== CREAR Y ENTRENAR MODELO ====================
async function crearYEntrenarModelo() {
  estadoModelo.textContent = "Cargando datos históricos...";
  spinner.style.display = "inline-block";

  const xsData = [];
  const ysData = [];
  for (let d = 0; d < 30; d++) {
    for (let h = 0; h < 24; h++) {
      const temp = Math.random() * 20 + 10;
      const personas = Math.random() * 30 + 5;
      const diaSemana = (d % 7) + 1;
      xsData.push([temp, h, personas, diaSemana]);
      ysData.push([temp * 10 + personas * 5 + 50]);
    }
  }

  estadoModelo.textContent = "Entrenando modelo...";
  barra.style.display = "block";

  const xs = tf.tensor2d(xsData);
  const ys = tf.tensor2d(ysData);

  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  await model.fit(xs, ys, {
    epochs: 50,
    verbose: 0,
    callbacks: {
      onEpochEnd: (epoch) => {
        const progreso = Math.floor(((epoch + 1) / 50) * 100);
        barraInner.style.width = progreso + "%";
        barraInner.textContent = progreso + "%";
      }
    }
  });

  spinner.style.display = "none";
  barra.style.display = "none";
  estadoModelo.textContent = "Modelo listo ✅";

  return model;
}

// ==================== GRÁFICO ====================
const ctx = document.getElementById('graficoConsumo').getContext('2d');
const grafico = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Consumo estimado (kWh)',
      data: [],
      backgroundColor: []
    }]
  },
  options: {
    scales: { y: { beginAtZero: true } }
  }
});

// ==================== HISTORIAL ====================
function cargarHistorial() {
  let historial = JSON.parse(localStorage.getItem('consumoHist')) || [];
  historial.forEach(dato => {
    grafico.data.labels.push(`Día ${dato.dia} - Hora ${dato.hora} - Temp: ${dato.temp.toFixed(1)}°C - Personas: ${dato.personas}`);
    grafico.data.datasets[0].data.push(dato.consumo);
    grafico.data.datasets[0].backgroundColor.push(colorPorConsumo(dato.consumo));
  });
  grafico.update();
}

function guardarEnHistorial(dato) {
  let historial = JSON.parse(localStorage.getItem('consumoHist')) || [];
  historial.push(dato);
  if (historial.length > 7) historial.shift();
  localStorage.setItem('consumoHist', JSON.stringify(historial));
}

// ==================== EVENTOS ====================

// Borrar historial
document.getElementById("borrarHistorialBtn")?.addEventListener("click", () => {
  localStorage.removeItem('consumoHist');
  grafico.data.labels = [];
  grafico.data.datasets[0].data = [];
  grafico.data.datasets[0].backgroundColor = [];
  grafico.update();
});

// Predecir consumo
document.getElementById("predecirBtn").addEventListener("click", async () => {
  if (!modeloIA) { alert("Modelo aún cargando..."); return; }

  const ciudad = document.getElementById("ciudad").value.trim();
  const hora = parseFloat(document.getElementById("hora").value);
  const personas = parseFloat(document.getElementById("personas").value);
  const dia = parseFloat(document.getElementById("dia").value);

  if (hora < 0 || hora > 23 || personas < 1 || personas > 50 || dia < 1 || dia > 7) {
    alert("Por favor ingrese valores válidos:\nHora: 0-23\nPersonas: 1-50\nDía: 1-7");
    return;
  }

  if (!ciudad) { alert("Por favor ingresa el nombre de una ciudad."); return; }

  // Obtener coordenadas
  const coords = await obtenerCoordenadas(ciudad);
  if (!coords) { alert("No se pudo encontrar esa ciudad."); return; }

  // Obtener temperatura actual
  let temp = await obtenerTemperatura(coords.lat, coords.lon);
  if (temp === null) {
    alert("No se pudo obtener la temperatura actual. Se usará 22°C por defecto.");
    temp = 22;
  }

  // Predecir consumo
  const entrada = tf.tensor2d([[temp, hora, personas, dia]]);
  const prediccion = modeloIA.predict(entrada);
  const valorMensual = (await prediccion.data())[0];
  const valorDiario = valorMensual / 30;

  // Mostrar resultado
  const color = colorPorConsumo(valorDiario);
  document.getElementById("resultado").textContent =
    `Ciudad: ${coords.nombre} | Temp: ${temp}°C | Consumo estimado: ${valorDiario.toFixed(2)} kWh/día`;
  document.getElementById("resultado").style.color = color;
  document.getElementById("mensajeConsumo").textContent = mensajeConsumo(valorDiario);

  // Guardar en historial y actualizar gráfico
  const nuevoDato = { dia, hora, temp, personas, consumo: valorDiario };
  guardarEnHistorial(nuevoDato);

  grafico.data.labels.push(`Día ${dia} - Hora ${hora}`);
  grafico.data.datasets[0].data.push(valorDiario.toFixed(2));
  grafico.data.datasets[0].backgroundColor.push(color);
  grafico.update();

  entrada.dispose();
  prediccion.dispose();
});

// Limpiar formulario
document.getElementById("limpiarBtn").addEventListener("click", () => {
  document.getElementById("ciudad").value = "";
  document.getElementById("hora").value = "";
  document.getElementById("personas").value = "";
  document.getElementById("dia").value = "";
  document.getElementById("resultado").textContent = "Resultado: -";
  document.getElementById("mensajeConsumo").textContent = "";

  grafico.data.labels = [];
  grafico.data.datasets[0].data = [];
  grafico.data.datasets[0].backgroundColor = [];
  grafico.update();
});

// ==================== INICIALIZACIÓN ====================
crearYEntrenarModelo().then(m => modeloIA = m);
// cargarHistorial();
