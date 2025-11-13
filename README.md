# Predicción de Consumo Energético con Inteligencia Artificial (Prueba de Concepto)

Este proyecto demuestra la aplicación práctica de **Inteligencia Artificial** utilizando **TensorFlow.js** para predecir el consumo energético estimado (kWh/día) según variables como la temperatura, hora del día, cantidad de personas y día de la semana.

---

## Descripción general

La aplicación:
1. Obtiene las coordenadas de una ciudad mediante la API de Open-Meteo.
2. Consulta la temperatura actual del lugar.
3. Alimenta esos datos junto con los valores ingresados por el usuario al modelo de IA.
4. El modelo predice el consumo energético estimado.
5. Muestra el resultado en pantalla y lo guarda en un historial visualizado con Chart.js.

---

## Tecnologías utilizadas

- **TensorFlow.js**: librería de JavaScript para construir y entrenar modelos de redes neuronales directamente en el navegador.
- **Chart.js**: librería para visualización de datos en gráficos dinámicos.
- **Open-Meteo Geocoding API**: obtiene latitud y longitud a partir del nombre de una ciudad.
- **Open-Meteo Forecast API**: obtiene temperatura actual y pronóstico.
- **LocalStorage**: guarda el historial de predicciones localmente.

---

## Arquitectura del modelo de IA

El modelo utiliza una **red neuronal secuencial de tres capas densas**, lo que significa que cada neurona de una capa está conectada con todas las neuronas de la siguiente capa.  
Este tipo de arquitectura es ideal para problemas de **regresión**, como la predicción del consumo energético.

```js
const model = tf.sequential();
model.add(tf.layers.dense({ inputShape: [4], units: 8, activation: 'relu' }));
model.add(tf.layers.dense({ units: 4, activation: 'relu' }));
model.add(tf.layers.dense({ units: 1, activation: 'linear' }));
model.compile({ optimizer: 'adam', loss: 'meanSquaredError' });


```
flowchart TD
    A[Inicio] --> B[Carga de datos de entrada]
    B --> C[Preprocesamiento de datos]
    C --> D[Definición del modelo secuencial]
    D --> E[Configuración del optimizador Adam y función de pérdida]
    E --> F[Entrenamiento del modelo con TensorFlow]
    F --> G[Evaluación de precisión]
    G --> H[Visualización de resultados con Chart.js]
    H --> I[Fin]

