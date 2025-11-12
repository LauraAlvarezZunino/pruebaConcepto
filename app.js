// Crear y entrenar modelo IA
async function crearYEntrenarModelo() {
  const model = tf.sequential();
  model.add(tf.layers.dense({inputShape: [4], units: 8, activation: 'relu'}));
  model.add(tf.layers.dense({units: 4, activation: 'relu'}));
  model.add(tf.layers.dense({units: 1, activation: 'linear'}));

  model.compile({optimizer: 'adam', loss: 'meanSquaredError'});

  // Datos simulados: [temperatura, hora, personas, dia] => consumo kWh
  const xs = tf.tensor2d([
    [15, 8, 10, 1],
    [30, 15, 20, 2],
    [22, 20, 5, 3],
    [18, 10, 15, 4],
    [28, 14, 25, 5],
    [25, 19, 30, 6],
    [10, 6, 5, 7],
  ]);
  const ys = tf.tensor2d([[120],[250],[180],[160],[270],[300],[100]]);

  await model.fit(xs, ys, {epochs: 200, verbose: 0});
  console.log("Modelo entrenado correctamente.");
  return model;
}

let modeloIA;
crearYEntrenarModelo().then(m => modeloIA = m);

// Configuración de gráfico
const ctx = document.getElementById('graficoConsumo').getContext('2d');
const grafico = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Consumo estimado (kWh)',
            data: [],
            backgroundColor: 'rgba(54, 162, 235, 0.6)'
        }]
    },
    options: {
        scales: { y: { beginAtZero: true } }
    }
});

// Capturar inputs y predecir
document.getElementById("predecirBtn").addEventListener("click", async () => {
  if (!modeloIA) { alert("Modelo aún cargando..."); return; }

  const ciudad = document.getElementById("ciudad").value.trim();
  const hora = parseFloat(document.getElementById("hora").value);
  const personas = parseFloat(document.getElementById("personas").value);
  const dia = parseFloat(document.getElementById("dia").value);

  if (!ciudad) {
    alert("Por favor ingresa el nombre de una ciudad.");
    return;
  }

  const coords = await obtenerCoordenadas(ciudad);
  if (!coords) {
    alert("No se pudo encontrar esa ciudad.");
    return;
  }

  const temp = await obtenerTemperatura(coords.lat, coords.lon);
  if (temp === null) {
    alert("No se pudo obtener la temperatura actual.");
    return;
  }

  const entrada = tf.tensor2d([[temp, hora, personas, dia]]);
  const prediccion = modeloIA.predict(entrada);
  const valor = (await prediccion.data())[0].toFixed(2);

  document.getElementById("resultado").textContent =
    `Ciudad: ${coords.nombre} | Temp: ${temp}°C | Consumo estimado: ${valor} kWh`;

  grafico.data.labels.push(`Día ${dia} - Hora ${hora}`);
  grafico.data.datasets[0].data.push(valor);
  grafico.update();
});


// Explicación para presentación
console.log("Esta demo muestra cómo la IA puede predecir consumo energético según condiciones ambientales y ocupación, ayudando a optimizar calefacción e iluminación automáticamente.");
// Obtener temperatura 
async function obtenerTemperatura(lat, lon) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m`;
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    return datos.current?.temperature_2m ?? null;
  } catch (error) {
    console.error("Error al obtener datos del clima:", error);
    return null;
  }
}

// geolocalizacion 
async function obtenerCoordenadas(ciudad) {
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(ciudad)}&count=1`;
    const respuesta = await fetch(url);
    const datos = await respuesta.json();
    
    if (datos.results && datos.results.length > 0) {
      const { latitude, longitude, name, country } = datos.results[0];
      return { lat: latitude, lon: longitude, nombre: `${name}, ${country}` };
    } else {
      return null;
    }
  } catch (error) {
    console.error("Error al obtener coordenadas:", error);
    return null;
  }
}