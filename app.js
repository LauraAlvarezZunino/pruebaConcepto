let modeloIA;
const spinner = document.getElementById('spinner');
const barra = document.getElementById('barraProgreso');
const barraInner = barra.querySelector('div');
const estadoModelo = document.getElementById('estadoModelo');

// ==================== CLASIFICACIÓN ====================
function colorPorConsumo(valor) {
  if (valor < 0.8) return 'rgba(54, 235, 54, 0.6)';
  if (valor < 1.5) return  'rgba(232, 197, 71, 0.7)';
  return 'rgba(235, 54, 54, 0.6)';
}

function mensajeConsumo(valor) {
  if (valor < 0.8) return "Consumo bajo ✅";
  if (valor < 1.5) return "Consumo medio ⚠️";
  return "Consumo alto ❌";
}

// ==================== GEOLOCALIZACIÓN ====================
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

// ==================== CLIMA POR DÍA Y HORA ====================
// Día 1 = MAÑANA, 2 = PASADO, etc.
async function obtenerTemperaturaPronostico(lat, lon, dia, hora) {
  try {
    const hoy = new Date();

    // día 1 es mañana
    const fecha = new Date(hoy.getTime() + dia * 24 * 60 * 60 * 1000);
    const fechaStr = fecha.toISOString().split("T")[0];

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&start_date=${fechaStr}&end_date=${fechaStr}&timezone=America/Argentina/Buenos_Aires`;

    const res = await fetch(url);
    const data = await res.json();

    if (!data.hourly || !data.hourly.temperature_2m) {
      console.error("No hay datos horarios para:", fechaStr);
      return null;
    }

    return data.hourly.temperature_2m[hora];

  } catch (error) {
    console.error("Error al obtener temperatura:", error);
    return null;
  }
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

      let consumo = 0.3;
      consumo += temp * 0.03;
      consumo += personas * 0.02;
      if (h >= 18 && h <= 23) consumo += 0.7;
      if (h >= 0 && h <= 5) consumo -= 0.2;

      consumo = Math.max(consumo, 0.1);
      ysData.push([consumo]);
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
    scales: {
      y: { beginAtZero: true }
    },
    plugins: {
      tooltip: {
        callbacks: {
          label: function (context) {
            const index = context.dataIndex;
            const info = context.chart.infoExtra[index];
            return [
              `Ciudad: ${info.ciudad}`,
              `Temp: ${info.temperatura}°C`,
              `Día: ${info.dia}`,
              `Hora: ${info.hora}`,
              `Personas: ${info.personas}`,
              `Consumo: ${info.consumo} kWh/hora`
            ];
          }
        }
      }
    }
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
  grafico.infoExtra = [];   // ← FIX IMPORTANTE
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

  if (!ciudad) { alert("Por favor ingresa una ciudad."); return; }

  const coords = await obtenerCoordenadas(ciudad);
  if (!coords) { alert("No se encontró esa ciudad."); return; }

  // === Temperatura según día (1=mañana, 2=pasado…) y hora ===
  let temp = await obtenerTemperaturaPronostico(coords.lat, coords.lon, dia, hora);

  if (temp === null) {
    alert("No se pudo obtener la temperatura exacta. Se usará 22°C por defecto.");
    temp = 22;
  }

  // === IA ===
  const entrada = tf.tensor2d([[temp, hora, personas, dia]]);
  const prediccion = modeloIA.predict(entrada);
  const valorHora = (await prediccion.data())[0];

  // Mostrar resultado
  document.getElementById("resultado").textContent =
    `Ciudad: ${coords.nombre} | Temp: ${temp.toFixed(1)}°C | Consumo: ${valorHora.toFixed(2)} kWh/h`;

  const color = colorPorConsumo(valorHora);
  document.getElementById("resultado").style.color = color;
  document.getElementById("mensajeConsumo").textContent = mensajeConsumo(valorHora);

  // Gráfico
  grafico.data.labels.push(`Predicción ${grafico.data.labels.length + 1}`);
  grafico.data.datasets[0].data.push(valorHora);
  grafico.data.datasets[0].backgroundColor.push(color);

  if (!grafico.infoExtra) grafico.infoExtra = [];
  grafico.infoExtra.push({
    ciudad: coords.nombre,
    temperatura: temp.toFixed(1),
    dia: dia,
    hora: hora,
    personas: personas,
    consumo: valorHora.toFixed(2)
  });

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
  grafico.infoExtra = [];   // ← Necesario
  grafico.update();
});

// ==================== INICIALIZACIÓN ====================
crearYEntrenarModelo().then(m => modeloIA = m);