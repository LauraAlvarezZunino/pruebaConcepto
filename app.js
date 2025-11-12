// -------------------- CONFIG --------------------
const API_KEY = 'TU_API_KEY_OPENWEATHER'; // reemplazar con tu API Key
const LAT = -34.61; // Buenos Aires
const LON = -58.38; 

let modeloIA;

// -------------------- FUNCIONES CLIMA --------------------
async function obtenerClimaHistorico(lat, lon, fechaUnix) {
    const url = `https://api.openweathermap.org/data/2.5/onecall/timemachine?lat=${lat}&lon=${lon}&dt=${fechaUnix}&units=metric&appid=${API_KEY}`;
    try {
        const res = await fetch(url);
        const data = await res.json();
        return data.current.temp; // temperatura promedio del día
    } catch (err) {
        console.error("Error al obtener clima:", err);
        return 20; // fallback
    }
}

// -------------------- ENTRENAR MODELO --------------------
async function crearYEntrenarModelo() {
    const model = tf.sequential();
    model.add(tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
    model.add(tf.layers.dense({ units: 1, activation: 'linear' }));

    model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });

    // ---------- Datos históricos simulados ----------
    const dias = [1,2,3,4,5,6,7];
    const horas = [8, 15, 20, 10, 14, 19, 6];
    const personas = [10, 20, 5, 15, 25, 30, 5];
    const consumoHistorico = [120, 250, 180, 160, 270, 300, 100];

    // Obtener temperaturas históricas (simulamos con API o fallback)
    const hoy = Math.floor(Date.now() / 1000);
    const climaHistorico = [];
    for (let i = 0; i < dias.length; i++) {
        const fechaUnix = hoy - (dias.length - i) * 86400; // días atrás
        const temp = await obtenerClimaHistorico(LAT, LON, fechaUnix);
        climaHistorico.push(temp);
    }

    const xs = tf.tensor2d(dias.map((dia,i) => [climaHistorico[i], horas[i], personas[i], dia]));
    const ys = tf.tensor2d(consumoHistorico.map(c => [c]));

    await model.fit(xs, ys, { epochs: 200, verbose: 0 });
    console.log("Modelo entrenado correctamente.");
    return model;
}

// -------------------- INICIALIZAR --------------------
crearYEntrenarModelo().then(m => modeloIA = m);

// -------------------- CONFIGURAR GRÁFICO --------------------
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
    options: { scales: { y: { beginAtZero: true } } }
});

// -------------------- PREDECIR --------------------
document.getElementById("predecirBtn").addEventListener("click", async () => {
    if (!modeloIA) { alert("Modelo aún cargando..."); return; }

    const tempInput = parseFloat(document.getElementById("temp").value);
    const hora = parseFloat(document.getElementById("hora").value);
    const personas = parseFloat(document.getElementById("personas").value);
    const dia = parseFloat(document.getElementById("dia").value);

    // Si tempInput está vacío, podemos consultar API de pronóstico
    let temp = tempInput;
    if (!temp) {
        const fechaUnix = Math.floor(Date.now() / 1000) + (dia-1)*86400;
        temp = await obtenerClimaHistorico(LAT, LON, fechaUnix);
    }

    const entrada = tf.tensor2d([[temp, hora, personas, dia]]);
    const prediccion = modeloIA.predict(entrada);
    const valor = (await prediccion.data())[0].toFixed(2);

    document.getElementById("resultado").textContent =
        `Consumo estimado: ${valor} kWh`;

    grafico.data.labels.push(`Día ${dia} - Hora ${hora}`);
    grafico.data.datasets[0].data.push(valor);
    grafico.update();
});

console.log("Esta demo muestra cómo la IA predice consumo energético según clima y ocupación.");
