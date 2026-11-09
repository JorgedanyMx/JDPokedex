/* =====================================================================
   POKEDEX.JSX — versión comentada línea por línea
   =====================================================================
   Este componente hace tres cosas:
   1. Guarda en "estado" qué Pokémon se está viendo (y otros datos).
   2. Pide los datos de ese Pokémon a PokeAPI cada vez que cambia.
   3. Dibuja la interfaz (HTML/JSX) usando esos datos.

   Idea clave de React: cuando cambia un "estado" (useState), React
   vuelve a ejecutar la función del componente y actualiza la pantalla.
   ===================================================================== */

// Importamos tres "hooks" (funciones especiales de React):
// - useState:    crea variables que, al cambiar, redibujan la pantalla.
// - useEffect:   ejecuta código "de fondo" (llamar a una API, escuchar el
//                teclado) cuando algo cambia.
// - useCallback: memoriza una función para que no se cree de nuevo en cada
//                redibujado (la necesitamos estable dentro de un useEffect).
import { useEffect, useState, useCallback } from "react";

// Importamos el archivo de estilos. Vite lo agrega a la página
// automáticamente; aquí viven los colores, el tamaño, la forma, etc.
import "./pokedex.css";

// URL base de PokeAPI. Al final le pegaremos el número del Pokémon:
// "https://pokeapi.co/api/v2/pokemon/25" devuelve a Pikachu.
const API = "https://pokeapi.co/api/v2/pokemon/";

// Cantidad de Pokémon disponibles (ids del 1 al 1025). Lo usamos para que
// la navegación "dé la vuelta": después del 1025 se regresa al 1.
const MAX_ID = 1025;

// "export default" permite importar este componente desde App.jsx.
// Un componente de React es simplemente una función que devuelve JSX.
export default function Pokedex() {
  /* ===================================================================
     1) ESTADO: la "memoria" del componente
     Formato: const [valor, funcionParaCambiarlo] = useState(valorInicial);
     Nunca se modifica "valor" directamente; siempre con su función.
     =================================================================== */

  // Número del Pokémon actual. Empieza en 1 (Bulbasaur).
  const [id, setId] = useState(1);

  // Objeto completo que devuelve la API (nombre, imágenes, movimientos...).
  // Empieza en null porque aún no hemos pedido nada.
  const [pokemon, setPokemon] = useState(null);

  // true mientras esperamos la respuesta de la API.
  const [loading, setLoading] = useState(false);

  // Texto del error si la petición falla; "" significa "sin error".
  const [error, setError] = useState("");

  // ¿El Pokédex está encendido? Lo controla el botón circular negro.
  const [on, setOn] = useState(true);

  // ¿Mostrar la versión shiny (color alternativo)? Lo controla el botón rojo.
  const [shiny, setShiny] = useState(false);

  // Índice (0-9) del botón azul seleccionado, o null si no hay ninguno.
  // Sirve para mostrar un solo movimiento en vez de toda la cadena.
  const [selected, setSelected] = useState(null);

  /* ===================================================================
     2) EFECTO: pedir datos a la API cuando cambia `id` u `on`
     useEffect(funcion, [dependencias])
     React ejecuta la función cada vez que alguna dependencia cambia.
     =================================================================== */
  useEffect(() => {
    // Si el Pokédex está apagado no pedimos nada. `return` sale del efecto.
    if (!on) return;

    // AbortController nos permite CANCELAR una petición en curso.
    // Es útil si el usuario presiona "siguiente" muy rápido: así una
    // respuesta vieja no pisa a la más reciente.
    const ctrl = new AbortController();

    setLoading(true);   // Activamos el estado "cargando" (parpadea el lente)
    setError("");       // Limpiamos cualquier error anterior
    setSelected(null);  // Quitamos la selección de movimiento del Pokémon previo

    // fetch hace la petición HTTP. Devuelve una "promesa": algo que se
    // resolverá en el futuro. Se encadena con .then(...) y .catch(...).
    // `signal` conecta la petición con el AbortController.
    fetch(API + id, { signal: ctrl.signal })
      // PRIMER .then: recibe la respuesta cruda (Response).
      .then((r) => {
        // r.ok es false si el servidor respondió 404, 500, etc.
        // `throw` lanza un error que salta directo al .catch de abajo.
        if (!r.ok) throw new Error("No se pudo cargar el Pokémon");
        // r.json() convierte el cuerpo de la respuesta en un objeto JS.
        // También devuelve una promesa, por eso hay otro .then.
        return r.json();
      })
      // SEGUNDO .then: recibe ya el objeto con los datos del Pokémon.
      .then((data) => {
        setPokemon(data);    // Guardamos los datos -> React redibuja
        setLoading(false);   // Ya no estamos cargando
      })
      // .catch atrapa cualquier error de arriba (red caída, 404, etc.).
      .catch((e) => {
        // Si el error es solo porque CANCELAMOS la petición, no es un
        // fallo real: lo ignoramos.
        if (e.name === "AbortError") return;
        setError(e.message);  // Mostramos el mensaje en la pantalla
        setLoading(false);
      });

    // Función de LIMPIEZA: React la ejecuta antes de repetir el efecto
    // (cuando `id` cambia) o al desmontar el componente. Aquí cancelamos
    // la petición pendiente.
    return () => ctrl.abort();
  }, [id, on]); // <- Dependencias: el efecto corre al cambiar `id` o `on`.

  /* ===================================================================
     3) FUNCIÓN DE NAVEGACIÓN
     move(1) = siguiente, move(-1) = anterior, move(10) = saltar 10, etc.
     =================================================================== */
  const move = useCallback(
    // setId acepta una función que recibe el valor actual (n) y devuelve
    // el nuevo. Así siempre trabajamos con el dato más reciente.
    (delta) => setId((n) => ((n - 1 + delta + MAX_ID * 10) % MAX_ID) + 1),
    // [] = la función no depende de nada, se crea una sola vez.
    []
  );
  /* Explicación de la fórmula, paso a paso:
     - Restamos 1 para trabajar con posiciones 0..1024 en vez de 1..1025.
     - Sumamos `delta` (el movimiento).
     - Sumamos MAX_ID * 10 para que el número nunca sea negativo (el
       operador % de JavaScript devuelve negativos con números negativos).
     - % MAX_ID hace que "dé la vuelta" al pasar del final.
     - Sumamos 1 para volver al rango 1..1025.
     Ejemplo: id=1025 y delta=+1  ->  (1024+1+10250) % 1025 + 1 = 1
     Ejemplo: id=1    y delta=-1  ->  (0-1+10250) % 1025 + 1 = 1025 */

  /* ===================================================================
     4) EFECTO: controlar el Pokédex con las flechas del teclado
     =================================================================== */
  useEffect(() => {
    // Función que se ejecuta cada vez que se presiona una tecla.
    const onKey = (e) => {
      if (!on) return; // Apagado: el teclado no hace nada
      // e.key trae el nombre de la tecla presionada.
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
      if (e.key === "ArrowUp") move(10);
      if (e.key === "ArrowDown") move(-10);
    };

    // Registramos el "oyente" en toda la ventana.
    window.addEventListener("keydown", onKey);

    // LIMPIEZA: quitamos el oyente. Si no lo hiciéramos, se acumularían
    // oyentes duplicados cada vez que el efecto se vuelve a ejecutar.
    return () => window.removeEventListener("keydown", onKey);
  }, [on, move]); // Se vuelve a registrar si cambia `on` o `move`.

  /* ===================================================================
     5) VALORES DERIVADOS
     Se calculan a partir del estado en cada redibujado. No necesitan
     useState porque siempre se pueden recalcular.
     =================================================================== */

  // Lista de nombres de movimientos.
  // La API entrega: moves: [{ move: { name: "pound", url: "..." } }, ...]
  // .map recorre la lista y extrae solo el nombre; .replace cambia los
  // guiones por espacios ("mega-punch" -> "mega punch").
  // La /-/g significa "todos los guiones" (g = global).
  // Si aún no hay pokemon, usamos una lista vacía para no fallar.
  const moves = pokemon ? pokemon.moves.map((m) => m.move.name.replace(/-/g, " ")) : [];

  // `lit` = ¿el Pokédex está "activo"? Se cumple si está encendido, ya
  // llegaron datos y no estamos cargando. Con esto encendemos el lente
  // azul y habilitamos pantallas y botones.
  // `!!pokemon` convierte el objeto (o null) en true/false.
  const lit = on && !!pokemon && !loading;

  // Atajo para escribir menos: objeto con todas las imágenes.
  // El signo ?. ("encadenamiento opcional") evita error si pokemon es null.
  const sprites = pokemon?.sprites;

  // Elegimos qué imagen mostrar, de mejor a peor opción:
  // 1) Si shiny está activo y existe la imagen shiny, usarla.
  // 2) Si no, el "official-artwork" normal (imagen grande y bonita).
  // 3) Si tampoco existe, el sprite pequeño clásico.
  // El operador || devuelve el primer valor "verdadero" (que exista).
  // El operador && hace que `shiny && ...` sea false si shiny es false.
  const img = pokemon
    ? (shiny && sprites.other["official-artwork"].front_shiny) ||
      sprites.other["official-artwork"].front_default ||
      sprites.front_default
    : null;

  // Texto de la pantalla de movimientos:
  // - Si hay un botón azul seleccionado: solo ese movimiento.
  // - Si no: todos unidos con "  •  " entre ellos (.join).
  const marquee = selected !== null ? moves[selected] : moves.join("  •  ");

  /* ===================================================================
     6) JSX: lo que se dibuja en pantalla
     JSX parece HTML pero es JavaScript. Diferencias importantes:
     - "class" se escribe `className`.
     - Entre llaves { } puedes poner cualquier expresión de JS.
     - Los comentarios dentro del JSX se escriben con llaves + barra-asterisco
     (como los que ves más abajo, entre las etiquetas).
     =================================================================== */
  return (
    // <main> envuelve toda la página; .stage centra el Pokédex.
    <main className="stage">
      {/* Contenedor del Pokédex: una cuadrícula de 3 columnas
          (panel izquierdo | bisagra | panel derecho). */}
      <div className="pokedex">
        {/* ============ PANEL IZQUIERDO ============ */}
        <section className="panel left">
          {/* Cabecera: lente azul + 3 luces pequeñas */}
          <header className="top">
            {/* Las clases del lente son dinámicas con plantillas `${}`:
                - "on"    se agrega solo si lit es true  (lente encendido)
                - "blink" se agrega solo si loading es true (parpadeo)
                Si la condición es false, se agrega "" (nada). */}
            <div className={`lens ${lit ? "on" : ""} ${loading ? "blink" : ""}`} />
            {/* Luces roja, amarilla y verde (solo decoración) */}
            <span className="led r" />
            <span className="led y" />
            <span className="led g" />
          </header>

          {/* Marco blanco que rodea la pantalla, como en la serie */}
          <div className="frame">
            {/* Pantalla negra principal */}
            <div className="screen main">
              {/* Renderizado condicional con &&: si la parte izquierda es
                  true, React dibuja lo de la derecha; si es false, nada. */}
              {!on && <p className="msg">Apagado</p>}
              {on && loading && <p className="msg">Cargando…</p>}
              {on && error && <p className="msg err">{error}</p>}
              {/* Solo mostramos la imagen si el Pokédex está activo y
                  no hubo error. alt = texto alternativo (accesibilidad). */}
              {lit && !error && <img src={img} alt={pokemon.name} />}
            </div>
          </div>

          {/* Zona de controles (parte inferior izquierda) */}
          <div className="controls">
            {/* Fila de arriba: botón negro + pastillas roja y azul */}
            <div className="row-top">
              {/* aria-label: lo leen los lectores de pantalla.
                  title: el globito que aparece al pasar el mouse.
                  onClick: función que corre al hacer clic.
                  setOn((v) => !v) invierte el valor: true<->false. */}
              <button className="round" aria-label="Encender o apagar" title="Encender / apagar" onClick={() => setOn((v) => !v)} />
              {/* Botón rojo: alterna shiny, igual que el de arriba. */}
              <button className="pill red" aria-label="Alternar versión shiny" title="Cambiar a versión shiny" onClick={() => setShiny((v) => !v)} />
              {/* Botón azul: número aleatorio entre 1 y MAX_ID.
                  Math.random() da un decimal entre 0 y 1; al multiplicarlo
                  por MAX_ID y redondear hacia abajo (Math.floor) obtenemos
                  0..1024; sumamos 1 para obtener 1..1025. */}
              <button className="pill blue" aria-label="Pokémon aleatorio" title="Pokémon aleatorio" onClick={() => setId(1 + Math.floor(Math.random() * MAX_ID))} />
            </div>

            {/* Fila de abajo: pantalla del nombre + cruceta */}
            <div className="row-bottom">
              {/* Pantalla verde con número y nombre.
                  String(n).padStart(4, "0") rellena con ceros a la
                  izquierda hasta tener 4 dígitos: 25 -> "0025".
                  Si no está activo, mostramos "---". */}
              <div className="screen name">
                {lit ? `#${String(pokemon.id).padStart(4, "0")} ${pokemon.name}` : "---"}
              </div>

              {/* Cruceta estilo Nintendo. role="group" y aria-label
                  ayudan a los lectores de pantalla.
                  `on && move(...)` significa: solo ejecuta move si el
                  Pokédex está encendido. */}
              <div className="dpad" role="group" aria-label="Control de navegación">
                <button className="up" aria-label="Diez adelante" title="Avanzar 10 Pokémon" onClick={() => on && move(10)} />
                <button className="left" aria-label="Anterior" title="Pokémon anterior" onClick={() => on && move(-1)} />
                {/* Cuadrito central de la cruceta (solo decoración).
                    Si tu archivo no lo tiene, añádelo: sin él, la cruz
                    se ve con un hueco en el centro. */}
                <span className="center" />
                <button className="right" aria-label="Siguiente" title="Siguiente Pokémon" onClick={() => on && move(1)} />
                <button className="down" aria-label="Diez atrás" title="Retroceder 10 Pokémon" onClick={() => on && move(-10)} />
              </div>
            </div>
          </div>
        </section>

        {/* Bisagra central entre los dos paneles (solo decoración) */}
        <div className="hinge" />

        {/* ============ PANEL DERECHO ============ */}
        <section className="panel right">
          {/* Pantalla larga de movimientos.
              aria-live="polite": el lector de pantalla anuncia los
              cambios de texto sin interrumpir al usuario. */}
          <div className="screen moves" aria-live="polite">
            {lit && (
              <div className="track">
                {/* key={marquee}: cuando cambia el texto, React destruye
                    el <span> y crea uno nuevo, así la animación se
                    reinicia desde el principio.
                    La clase "scroll" (animación de desplazamiento) solo
                    se usa cuando se ve la cadena completa. */}
                <span key={marquee} className={selected === null ? "scroll" : ""}>
                  {marquee}
                  {/* Duplicamos el texto para que el desplazamiento sea
                      continuo: la animación mueve el span la mitad de su
                      ancho (-50%) y, al reiniciar, la copia ocupa justo
                      el lugar de la original, sin saltos visibles. */}
                  {selected === null && `  •  ${marquee}`}
                </span>
              </div>
            )}
          </div>

          {/* Cuadrícula con los 10 botones azules (5 columnas x 2 filas
              definidas en el CSS). */}
          <div className="grid">
            {/* Array.from({ length: 10 }, (_, i) => ...) crea una lista
                de 10 elementos. `_` es el valor (no lo usamos) e `i` el
                índice 0..9. Así no escribimos 10 botones a mano. */}
            {Array.from({ length: 10 }, (_, i) => (
              <button
                // React exige un `key` único en listas para identificar
                // cada elemento al redibujar.
                key={i}
                // La clase "sel" resalta (verde) el botón seleccionado.
                className={`key ${selected === i ? "sel" : ""}`}
                // Deshabilitado si el Pokédex no está activo O si este
                // botón no tiene movimiento (i >= cantidad de movimientos).
                // Es lo que hace que "se activen según el número de movimientos".
                disabled={!lit || i >= moves.length}
                aria-label={`Movimiento ${i + 1}`}
                // Globito con el nombre del movimiento (si existe).
                title={moves[i] ? `Ver movimiento: ${moves[i]}` : "Sin movimiento"}
                // Si ya estaba seleccionado, lo deseleccionamos (null);
                // si no, seleccionamos este índice. Es un "interruptor".
                onClick={() => setSelected(selected === i ? null : i)}
              />
            ))}
          </div>

          {/* Zona inferior decorativa: copia los botones de la imagen
              de referencia, pero no hace nada. */}
          <div className="deco">
            <span className="white-btn" />
            <span className="dash" />
            <span className="dash" />
            <span className="dark-bar" />
            <span className="dark-bar wide" />
            <span className="yellow" />
          </div>
        </section>
      </div>
    </main>
  );
}
