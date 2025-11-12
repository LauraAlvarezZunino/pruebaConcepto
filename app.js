// ==================== MODELO DE IA ====================
async function crearYEntrenarModelo() {
  const model = tf.sequential();
  model.add(tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
  model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

  model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

  // Datos simulados: [temperatura, hora, personas, dia] => consumo kWh mensual
  const xs = tf.tensor2d([
    [15, 8, 10, 1],
    [30, 15, 20, 2],
    [22, 20, 5, 3],
    [18, 10, 15, 4],
    [28, 14, 25, 5],
    [25, 19, 30, 6],
    [10, 6, 5, 7],
  ]);
  const ys = tf.tensor2d([[120],[250],[180],[160],[270],[300],[100]]); // consumo mensual kWh

  await model.fit(xs, ys, { epochs: 200, verbose: 0 });
  console.log("Modelo entrenado correctamente.");
  return model;
}

let modeloIA;
crearYEntrenarModelo().then(m => modeloIA = m);

// ==================== GRÁFICO ====================
const ctx = document.getElementById('graficoConsumo').getContext('2d');
const grafico = new Chart(ctx, {
  type: 'bar',
  data: {
    labels: [],
    datasets: [{
      label: 'Consumo estimado (kWh/día)',
      data: [],
      backgroundColor: [],
    }]
  },
  options: { scales: { y: { beginAtZero: true } } }
});

// ==================== FUNCIONES DE CLASIFICACIÓN ====================
function colorPorConsumo(valor) {
  if(valor <= 13.33) return 'rgba(54, 235, 54, 0.6)'; // verde
  if(valor <= 20) return 'rgba(235, 235, 54, 0.6)';    // amarillo
  return 'rgba(235, 54, 54, 0.6)';                     // rojo
}

function mensajeConsumo(valor) {
  if(valor <= 13.33) return "Consumo bajo ✅";
  if(valor <= 20) return "Consumo medio ⚠️";
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

// ==================== PREDICCIÓN ====================
document.getElementById("predecirBtn").addEventListener("click", async () => {
  if (!modeloIA) { alert("Modelo aún cargando..."); return; }

  const ciudad = document.getElementById("ciudad").value.trim();
  const hora = parseFloat(document.getElementById("hora").value);
  const personas = parseFloat(document.getElementById("personas").value);
  const dia = parseFloat(document.getElementById("dia").value);

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
  const valorDiario = valorMensual / 30; // Convertir a kWh/día

  // Mostrar resultado
  const color = colorPorConsumo(valorDiario);
  document.getElementById("resultado").textContent =
    `Ciudad: ${coords.nombre} | Temp: ${temp}°C | Consumo estimado: ${valorDiario.toFixed(2)} kWh/día`;
  document.getElementById("resultado").style.color = color;
  document.getElementById("mensajeConsumo").textContent = mensajeConsumo(valorDiario);

  // Actualizar gráfico
  grafico.data.labels.push(`Día ${dia} - Hora ${hora}`);
  grafico.data.datasets[0].data.push(valorDiario.toFixed(2));
  grafico.data.datasets[0].backgroundColor.push(color);
  grafico.update();
});

// ==================== LIMPIAR ====================
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
