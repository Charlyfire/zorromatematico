# Mira y Recuerda

Aplicación web educativa de **observación, memoria y lógica visual** diseñada para jugar desde los **3 años hasta adultos** en ordenador, tablet y pizarra digital interactiva (**PDI / Asamblea**). Funciona **100 % en local sin cuentas ni servidores externos** (persistencia con IndexedDB).

## 8 juegos incluidos

1. **Memory de parejas**: desde 2 parejas (Inicial) hasta 8 parejas / 16 cartas (Avanzado) con giro automático.
2. **¿Qué ha cambiado?**: desaparición de objetos, desplazamiento, giro e intercambio de posición.
3. **Recuerda el orden**: memorización y reconstrucción de secuencias visuales con distractores progresivos.
4. **Correspondencias visuales**: siluetas, parejas relacionadas (*animal y cría*, *alimento y corte*, *prenda y dónde se coloca*) y fragmentos ampliados.
5. **Clasificación**: por paisajes/temáticas combinadas y por atributos (formas con ejemplo guía y cuadrículas de doble entrada *Forma × Orientación*, *Forma × Patrón* y *Temática × Tamaño*).
6. **El intruso**: descubre qué dibujo no pertenece al grupo por categoría temática o regla semántica.
7. **Ojo de lince** (estilo Dobble): dos cartas circulares con 3 a 8 dibujos donde solo uno se repite.
8. **Completa la serie**: patrones visuales repetitivos (`A-B-A-?`, `A-B-C`, hueco intermedio, tamaños y doble regla / giros).

## Características principales

- **13 temáticas ilustradas** con más de 140 imágenes y siluetas listas para usar.
- **Selector libre de temáticas**: juega con **1 temática, varias combinadas o todas a la vez**, tanto en el menú como sin salir de la partida.
- **Modo Individual y Asamblea / PDI**, vista horizontal optimizada sin scroll.
- **Banco propio de imágenes y parejas**, con recorte automático de láminas 2×4, exportación/importación en un archivo `.json` y **generador de tarjetas imprimibles en A4 / PDF**.

## Desarrollo local

```bash
npm install
npm run dev
```

Para generar la versión de producción:

```bash
npm run build
```
