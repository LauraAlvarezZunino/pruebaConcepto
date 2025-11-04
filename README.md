## Flujo del Código: Red Neuronal de Estimación de Consumo

El proyecto implementa una **Red Neuronal Simple** para predecir el consumo energético (kWh) en un edificio, utilizando datos simulados para la prueba de concepto (PoC).

---

### Arquitectura de la Red Neuronal

| Elemento | Descripción | Dimensiones | Activación |
| :--- | :--- | :--- | :--- |
| **Entrada (Input)** | Variables predictoras | 4 Neuronas | N/A |
| **Capa Intermedia 1** | Primera capa oculta | 8 Neuronas | **ReLU** |
| **Capa Intermedia 2** | Segunda capa oculta | 4 Neuronas | **ReLU** |
| **Salida (Output)** | Consumo energético estimado | 1 Neurona (kWh) | **Lineal** |

**Variables de Entrada:**
* **Temperatura**
* **Hora del Día**
* **Ocupación** (Número de personas o estado)
* **Día de la Semana** (o tipo de día)

---

###  Proceso de Ejecución

1.  **Entrenamiento con Datos Simulados:**
    * Se generan **manualmente** valores de ejemplo (`xs` y `ys`) para la demostración (PoC).
    * *Nota: En un caso real, estos datos provendrían de **sensores IoT** o **registros históricos** del edificio.*
2.  **Predicción en Tiempo Real (Simulada):**
    * El usuario interactúa con la interfaz (navegador) e ingresa **valores actuales** en los campos de entrada.
    * El modelo previamente entrenado procesa estos valores.
    * Se genera la **predicción** del consumo esperado.
3.  **Resultado y Visualización:**
    * El valor del **consumo estimado** (kWh) se muestra y actualiza en el elemento `<h2>` de la interfaz.
    * *Uso Potencial: En un escenario real, esta predicción se podría utilizar para realizar **ajustes automáticos** en sistemas como calefacción, iluminación o ventilación.*

---

## Posibles Extensiones para un Caso Real (Producción)

Para llevar este proyecto a un entorno operativo real, se pueden considerar las siguientes mejoras y ampliaciones:

* **Integración IoT:** Conexión con **sensores reales** para obtener datos de:
    * Temperatura (interior/exterior)
    * Luz ambiental
    * Niveles de ocupación
    * Consumo eléctrico en tiempo real
* **Backend y Base de Datos:** Implementación de un sistema de *backend* robusto para:
    * Almacenar y procesar **grandes volúmenes** de información (datos históricos).
    * Garantizar la disponibilidad y la calidad de los datos de entrenamiento.
* **Modelos Avanzados:** Uso de modelos de *Machine Learning* más complejos, entrenados con **datos reales** para mayor precisión:
    * **Redes Neuronales Profundas (DNN)**
    * Modelos de **Series de Tiempo** (como **LSTM** o **GRU**)
    * Modelos de **Regresión Múltiple** avanzados
* **Módulo de Optimización:** Desarrollo de un componente que actúe sobre la predicción, ofreciendo:
    * **Recomendaciones** proactivas al gestor del edificio.
    * **Ajustes automáticos** en tiempo real a los sistemas del edificio (ej. *Building Management System - BMS*).
