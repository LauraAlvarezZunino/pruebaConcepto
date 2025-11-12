const LAT = -34.61;
const LON = -58.38;

let modeloIA;
const spinner = document.getElementById('spinner');
const barra = document.getElementById('barraProgreso');
const barraInner = barra.querySelector('div');
const estadoModelo = document.getElementById('estadoModelo');

const ctx = document.getElementById('graficoConsumo').getContext('2d');
const grafico = new Chart(ctx, {
    type: 'bar',
    data: {
        labels: [],
        datasets: [{
            label: 'Consumo estimado (kWh)',
            data: [],
            backgroundColor: 'rgba(27, 73, 101, 0.6)'
        }]
    },
    options: {
        scales: { y: { beginAtZero: true } }
    }
});

// -------------------- Función para obtener temperatura --------------------
async function obtenerTemperaturaPronostico(lat, lon, dia) {
    const hoy = new Date();
    const fecha = new Date(hoy.getTime() + (dia-1)*24*60*60*1000);
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

// -------------------- Crear y entrenar modelo --------------------
async function crearYEntrenarModelo() {
    estadoModelo.textContent = "Cargando datos históricos...";
    spinner.style.display = "inline-block";

    const xsData = [];
    const ysData = [];
    for(let d=0; d<30; d++){
        for(let h=0; h<24; h++){
            const temp = Math.random()*20 + 10;
            const personas = Math.random()*30 + 5;
            const diaSemana = (d%7)+1;
            xsData.push([temp, h, personas, diaSemana]);
            ysData.push([temp*10 + personas*5 + 50]);
        }
    }

    estadoModelo.textContent = "Entrenando modelo...";
    barra.style.display = "block";

    const xs = tf.tensor2d(xsData);
    const ys = tf.tensor2d(ysData);

    const model = tf.sequential();
    model.add(tf.layers.dense({inputShape: [4], units: 8, activation: 'relu'}));
    model.add(tf.layers.dense({units: 4, activation: 'relu'}));
    model.add(tf.layers.dense({units: 1, activation: 'linear'}));
    model.compile({optimizer: 'adam', loss: 'meanSquaredError'});

    await model.fit(xs, ys, {
        epochs: 50,
        verbose: 0,
        callbacks: {
            onEpochEnd: (epoch) => {
                const progreso = Math.floor((epoch+1)/50*100);
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

// -------------------- Historial --------------------
function cargarHistorial() {
    let historial = JSON.parse(localStorage.getItem('consumoHist')) || [];
    historial.forEach(dato => {
        grafico.data.labels.push(`Día ${dato.dia} - Hora ${dato.hora} - Temp: ${dato.temp.toFixed(1)}°C - Personas: ${dato.personas}`);
        grafico.data.datasets[0].data.push(dato.consumo);
    });
    grafico.update();
}

function guardarEnHistorial(dato) {
    let historial = JSON.parse(localStorage.getItem('consumoHist')) || [];
    historial.push(dato);
    if(historial.length>7) historial.shift();
    localStorage.setItem('consumoHist', JSON.stringify(historial));
}

// -------------------- Eventos --------------------
document.getElementById("borrarHistorialBtn").addEventListener("click", () => {
    localStorage.removeItem('consumoHist');
    grafico.data.labels = [];
    grafico.data.datasets[0].data = [];
    grafico.update();
});

document.getElementById("predecirBtn").addEventListener("click", async () => {
    if (!modeloIA) { alert("Modelo aún cargando..."); return; }

    const hora = parseFloat(document.getElementById("hora").value);
    const personas = parseFloat(document.getElementById("personas").value);
    const dia = parseFloat(document.getElementById("dia").value);

    if(hora < 0 || hora > 23 || personas < 1 || personas > 50 || dia < 1 || dia > 7){
        alert("Por favor ingrese valores válidos:\nHora: 0-23\nPersonas: 1-50\nDía: 1-7");
        return;
    }

    const temp = await obtenerTemperaturaPronostico(LAT, LON, dia);

    const entrada = tf.tensor2d([[temp, hora, personas, dia]]);
    const prediccion = modeloIA.predict(entrada);
    const valor = (await prediccion.data())[0].toFixed(2);

    // Liberar tensores
    entrada.dispose();
    prediccion.dispose();

    document.getElementById("resultado").textContent =
        `Consumo estimado: ${valor} kWh (Temp: ${temp.toFixed(1)}°C, Personas: ${personas})`;

    const nuevoDato = { dia, hora, temp, personas, consumo: parseFloat(valor) };
    guardarEnHistorial(nuevoDato);

    grafico.data.labels.push(`Día ${dia} - Hora ${hora} - Temp: ${temp.toFixed(1)}°C - Personas: ${personas}`);
    grafico.data.datasets[0].data.push(valor);
    grafico.update();
});

// -------------------- Inicialización --------------------
crearYEntrenarModelo().then(m => modeloIA = m);
cargarHistorial();