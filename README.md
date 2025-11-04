Flujo del código
  Red neuronal simple (4 → 8 → 4 → 1):
    Entrada: temperatura, hora, ocupacion, dia 
    Capas intermedias: 8 y 4 neuronas con activación ReLU
    Salida: consumo energético estimado (kWh) con activación lineal
  Entrenamiento con datos simulados:
    En este caso se generan manualmente valores de ejemplo (xs y ys)
    En una PoC real, estos datos vendrían de sensores IoT o registros históricos del edificio
  Predicción en tiempo real:
    El usuario ingresa valores actuales en los inputs del navegador
    El modelo genera una predicción de consumo esperado
  Resultado mostrado:
    Se actualiza el h2 con el valor de consumo estimado
    En un escenario real, esta predicción se podría usar para ajustar calefacción, iluminación o ventilación automáticamente


Posibles extensiones para un caso real
    Sensores conectados por IoT: temperatura, luz, ocupación, consumo eléctrico
    Backend para datos históricos: almacenar y procesar grandes volúmenes de información
    Modelo más complejo: red neuronal profunda, LSTM o modelo de regresión múltiple entrenado con datos reales
    Módulo de optimización: recomendaciones o ajustes automáticos en tiempo real basados en predicciones
