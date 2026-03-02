# Guía avanzada de trabajo para el módulo de Reservaciones

## Objetivo
Optimizar la visualización y gestión de reservaciones, e implementar un menú visual y configurable para la administración de mesas y sillas.

## Alcance y tareas principales

1. **Filtrado de reservaciones por día**
   - Modificar la lógica de visualización para que, por defecto, solo se muestren las reservaciones correspondientes al día actual.
   - Implementar el filtrado usando la fecha del sistema y los datos de la API.
   - Mantener la opción de mostrar todas las reservaciones mediante el botón "Todas" y el resto de botones referentes a confirmadas, canceladas y completadas para el día seleccionado.

2. **Botón de calendario desplegable**
   - Agregar un botón de calendario entre la barra de búsqueda y el botón "Todas".
   - Permitir seleccionar una fecha específica o espacio de días para filtrar las reservaciones mostradas.
   - El calendario debe ser visualmente integrado y de fácil uso.

3. **Menú visual y configurable de mesas y sillas**
   - Implementar un menú visual donde el Admin User pueda:
     - Configurar el número de mesas.
     - Configurar la cantidad de sillas por mesa.
     - Agregar y nombrar diferentes pizarras (zonas) como Interior, Segundo piso, Terraza, Balcón, etc.
   - El menú debe ser intuitivo, visual y permitir futuras extensiones (por ejemplo, asignar reservaciones a mesas, ver disponibilidad, etc.).

## Buenas prácticas y recomendaciones
- Mantener la independencia del módulo, evitando dependencias directas con otros módulos.
- Utilizar componentes y servicios compartidos de la carpeta `shared` cuando sea necesario.
- Seguir buenas prácticas de React: hooks, manejo de estado, separación de lógica y presentación.
- Documentar en el código cada integración o cambio relevante.
- Si alguna función requiere cambios en la API, dejar constancia en este documento y notificar al equipo de backend.

