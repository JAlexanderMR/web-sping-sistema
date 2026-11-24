# SPING · Instalación y adaptación al montaje

Para instalar el puente en Windows, reservar una tarjeta y validar la conexión con la plataforma, abre **GUIA_SPING_USB.pdf** en la raíz del paquete. El comando **ENLACE** prueba el USB en ambos sentidos. **VINCULAR <UUID>** realiza la lectura independiente en banco con los servos desacoplados. El puente obtiene la confirmación de vinculación de la API.

Esta guía acompaña al firmware para Arduino Mega 2560. La canaleta tiene tres destinos vistos **desde el frente**. El servo de la compuerta mueve la corredera que sostiene la pieza mientras la sonda mide. [Abrir el sketch](SPING_Definitivo.ino)

| Mecanismo | Posiciones solicitadas |
| --- | --- |
| Canaleta, D34 | **10°** izquierda, inorgánico/seco · **90°** centro, rechazo · **170°** derecha, orgánico/húmedo |
| Corredera S3003, D35 | **130° cerrada** · **60° abierta** |
| Brazo, D30–D33 | Reposo, tres posiciones de aproximación y tres límites de descenso que se miden en el equipo |

## 1. Instalar y revisar las conexiones

1. Corta la alimentación de los servos. Conecta el Mega por USB. Conserva el regulador y las borneras de potencia del montaje R2. Une la masa de lógica y la de servos, y mantén separados el positivo de servos y el positivo USB del Mega. El corte físico de la alimentación de servos debe quedar al alcance durante la calibración.
2. Abre `SPING_Definitivo.ino` desde la carpeta completa `SPING_Definitivo`. En Arduino IDE selecciona **Arduino Mega or Mega 2560**, procesador **ATmega2560** y el puerto USB de la placa. Instala **Servo**, **MFRC522** y **LiquidCrystal_I2C** compatible con `init()` y `backlight()`. El núcleo Arduino AVR incluye `SPI`, `Wire` y `EEPROM`.
3. Verifica el sketch, súbelo y abre el monitor serie a **115200 baudios** con terminación **Nueva línea**. Al arrancar, el equipo entra en banco y deja los servos sin pulsos. Escribe `ESTADO` para inspeccionar entradas, `PERFIL` para consultar la calibración y `AYUDA` para ver los comandos. Envía un comando por línea, en mayúsculas. Espera `# OK` antes del siguiente ajuste. Ante `# Sin ejecutar`, revisa la posición física, las lecturas de `ESTADO` y las validaciones de `PERFIL`. El monitor y el puente usan el mismo puerto. Cierra el puente mientras trabajas en el monitor y cierra el monitor antes de abrir el puente.
4. Antes de calibrar, prueba el pulsador D41 con los servos sin potencia. Pulsa, verifica `modo=REVISION` y `causa=SERVICIO_D41` en `ESTADO`, suelta el botón y reinicia el Mega. Debe arrancar en `modo=BANCO`. Un fallo permanece enclavado hasta un reinicio y los cambios de calibración pendientes de `GUARDAR` se pierden al reiniciar.

| Componente | Señales del Mega | Comprobación en el montaje |
| --- | --- | --- |
| LCD 16×2 | D20 SDA, D21 SCL, dirección `0x27` | Debe mostrar el saludo de SPING. |
| HC-SR04 de entrada | D22 TRIG, D23 ECHO | Una pieza en su apoyo debe quedar a 10 cm o menos. La cámara vacía debe dar ecos válidos por encima de 12 cm. |
| YL-69 y contacto de sonda | AO → A0. Contacto normalmente abierto → D24 y GND | Al comprimir la sonda, D24 baja. Al levantarla, vuelve a subir. |
| IR común de caída | OUT → D2 | Debe ver el paso por debajo de la canaleta en las tres posiciones. D3 y D18 quedan libres. |
| Nivel de los tres cajones | D25 / D26 / D27, de izquierda a derecha | Nivel alto sostenido indica lleno. Comprueba libre y lleno por separado en cada cajón. |
| Cuatro servos del brazo | D30 base, D31 hombro, D32 codo, D33 pinza | Etiqueta cada señal antes de mover una articulación. La pinza sujeta la sonda. |
| Canaleta y corredera | D34 y D35 | Alimentación externa desde las borneras, señales desde el Mega. |
| Finales del selector | D36 izquierda, D37 centro, D38 derecha | En cada destino debe cerrar a GND únicamente el contacto correspondiente. |
| Finales de la corredera | D39 cerrada, D40 abierta | En cada extremo debe cerrar a GND únicamente el contacto correspondiente. |
| Servicio | D41 y GND, contacto normalmente abierto | Al pulsar, D41 baja. Sirve para inhibir el movimiento por software. Para acceder al mecanismo usa el corte físico. |
| RC522 SPI | D53 SS (rotulado SDA), D52 SCK, D51 MOSI, D50 MISO, D49 RST | Conserva la alimentación de 3,3 V y la adaptación de señales SPI del plano R2. |

La compilación de referencia usa Arduino AVR Boards 1.8.8, Servo 1.3.0, MFRC522 1.4.12 y LiquidCrystal_I2C 2.0.0. Esta última biblioteca emite un aviso sobre la arquitectura AVR aunque la compilación para el Mega termina correctamente. El saludo de la LCD durante el arranque permite comprobarla en tu equipo.

## 2. Comprobar el IR bajo la canaleta

1. **Identifica el módulo antes de alimentarlo.** Busca su referencia y la tensión admitida por VCC y OUT. La inscripción «VCC» por sí sola no fija la tensión. Si el módulo se calentó en la prueba anterior, déjalo desconectado hasta verificar referencia, patillaje y polaridad. Usa el esquema del fabricante para determinar si OUT necesita una resistencia de subida y a qué tensión. Lleva a D2 una salida digital compatible con el Mega, con adaptación de nivel si corresponde y masa común.
2. Fija el sensor de modo que el residuo atraviese su zona sensible **después de abandonar la canaleta** en cada destino. Si es una barrera, enfrenta emisor y receptor. Si es reflectivo, prueba la distancia con las piezas reales más pequeñas y oscuras. Sujeta el cable para que al girar la canaleta no interrumpa la señal.
3. Con la potencia de servos cortada, mide OUT respecto a GND con el paso vacío y consulta `ESTADO`. Envía `IR LIBRE`. Mantén una pieza delante del sensor, compara el nuevo voltaje y nivel digital con el anterior y envía `IR PASO` mientras sigue bloqueado. Los niveles tienen que ser opuestos. Retira la pieza, verifica que regresó al nivel libre y haz una caída completa. `ESTADO` permite leer el contador y el ancho del último pulso en microsegundos. `VALIDAR IR` requiere un pulso completo después de registrar la polaridad. Repite bajo la iluminación del lugar. D2 está configurado como `INPUT` sin resistencia interna de subida. Una lectura que cambia con el cable inmóvil y la salida despejada merece revisar la conexión y la polarización de OUT.
4. Ensaya los **tres destinos** con la canaleta posicionada y el paso libre. Deja caer una pieza por vez desde la entrada normal. Incluye las más pequeñas y rápidas, oscuras y transparentes que esperas procesar. Haz diez caídas por destino como primera serie y compara el incremento del contador entre lecturas de `ESTADO`. Anota los pulsos más corto y más largo. Cada pieza debe producir **un solo pulso de al menos 500 µs**, dejar libre la salida y llegar al cajón previsto. Con la canaleta vacía, moverla entre destinos debe producir cero detecciones. Si falla, revisa primero la posición, el campo de visión y el cableado, y repite el ensayo. Puedes completar esta serie tras ajustar el brazo y usar `SALIDA I`, `SALIDA C` y `SALIDA D` para posicionar la canaleta.
5. Prueba un paso vacío y un bloqueo sostenido. En una descarga normal, ninguno de esos ensayos debe producir un depósito acreditable. Un único IR demuestra que la pieza cruzó la salida. La posición del selector identifica hacia qué cajón apuntaba. Para verificar que la pieza llegó al interior de ese cajón, observa la caída durante la prueba.

| Dato para repetir o corregir la prueba | Medición en tu montaje |
| --- | --- |
| Referencia del IR, VCC y posición de montaje | ___ |
| D2 libre / D2 bloqueado, en voltios y nivel digital | ___ / ___ |
| Caídas reales frente a pulsos, izquierda / centro / derecha | ___ / ___ / ___ |
| Pulso más corto / más largo de una pieza, en µs | ___ / ___ |

## 3. Medir el brazo

Los valores que registrarás son **grados de mando de cada servo**. La lectura de un transportador sobre el eslabón puede servir de referencia visual. El valor que se guarda es la orden con la que el eslabón llegó a la posición observada.

Las tres aproximaciones deben corresponder a lugares distintos. Conserva el mismo ángulo de pinza en reposo y en los tres puntos para que sujete la sonda durante todo el barrido. `VALIDAR BRAZO` comprueba ambas condiciones.

Por ejemplo, si el hombro ya está en una posición comprobada de **82°** y el ensayo requiere avanzar un grado en el sentido creciente, escribe `EJE 2 83`. Sustituye ese número por el ángulo medido para tu equipo. Los corchetes angulares que se usan abajo representan valores que tú escribes.

1. Con la fuente de servos desconectada, despeja el mecanismo, cierra la corredera y sostiene el brazo para que no caiga al liberar el par. Comprueba `D39=0` y `D40=1` en `ESTADO`. `EJE` requiere la corredera cerrada. Si desconoces la posición inicial de un servo, ajusta la palanca con un probador de servos y el mecanismo descargado. Aplica una única señal por servo. Al transferirlo al Mega, usa la misma posición conocida como punto de partida. Retira las manos de la trayectoria antes de energizar. En banco, `EJE <n> <grados>` ordena un ángulo absoluto al eje elegido, con **1 = base, 2 = hombro, 3 = codo, 4 = pinza**. El primer mando puede provocar un salto si la articulación quedó en otro ángulo. Ensáyalo desacoplado o físicamente prealineado.
2. **Reposo.** Busca una posición en la que la sonda esté retirada y todo el brazo quede fuera del recorrido de la canaleta y de la corredera. Ordena y comprueba los cuatro ejes uno a uno con `EJE`, en pasos pequeños, y espera a que se detengan. Mantén la pinza en el ángulo necesario para sujetar la sonda sin apretarla contra su tope. Anota los cuatro valores y envía `POS R` para capturarlos como reposo.
3. **Aproximación.** Con la corredera cerrada, marca tres puntos en el área útil, cercano, central y lejano. Coloca una pieza de ensayo de espesor conocido. Para el punto cercano usa `EJE` hasta que ambos electrodos estén sobre él, separados del material y con D24 libre. Anota los cuatro ángulos y envía `POS 1`. Ensaya el recorrido con la sonda levantada para descartar roces y arrastres.
4. **Límite del hombro.** Desde esa posición, varía solo `EJE 2` de **1° en 1°** en el sentido que acerca la sonda. Observa D24 en `ESTADO` y la compresión del cabezal sobre una muestra fina representativa. Busca un límite que permita el contacto sin atravesar la pieza, tocar la corredera ni llegar a un tope mecánico. Si D24 sigue libre al llegar al límite físicamente admisible, corrige la geometría de ese punto. Anota el ángulo y envía `LIM 1`. Levanta la sonda volviendo el hombro a su ángulo de aproximación y comprueba que D24 queda libre.
5. Repite los dos pasos anteriores en el centro (`POS 2`, `LIM 2`) y en el punto lejano (`POS 3`, `LIM 3`). Prueba piezas de distinto espesor. Comprueba los trayectos reales de reposo a cada punto y de vuelta. En automático, hombro, codo y base pueden girar a la vez durante la aproximación. Tras medir, el hombro levanta la sonda y el brazo vuelve a reposo antes de pasar al punto siguiente. Deja los cuatro ejes en sus ángulos de reposo mediante `EJE` y verifica visualmente la separación respecto de la compuerta. D24 solo indica compresión. Envía `VALIDAR BRAZO` y revisa `PERFIL`. Repite la calibración después de desmontar o recolocar una palanca.

| Posición | Base D30 | Hombro D31 | Codo D32 | Pinza D33 | Límite de hombro |
| --- | --- | --- | --- | --- | --- |
| Reposo fuera de la cámara | ___° | ___° | ___° | ___° | — |
| Sobre punto 1, cercano | ___° | ___° | ___° | ___° | ___° |
| Sobre punto 2, central | ___° | ___° | ___° | ___° | ___° |
| Sobre punto 3, lejano | ___° | ___° | ___° | ___° | ___° |

## 4. Verificar la salida y guardar

Si el montaje inicial o un corte de energía dejó la corredera abierta, empieza con la potencia cortada y el brazo sostenido y retirado. Si el mecanismo impide colocarla cerrada sin esfuerzo, desacopla la biela, posiciona el S3003 a 130° con el probador y vuelve a montar con la corredera cerrada y la potencia cortada. Comprueba D39 y D40 antes del primer `EJE`. Esto permite recuperar la referencia sin girar a la fuerza los engranajes.

1. Con la potencia cortada y el brazo sostenido, utiliza `ESTADO` mientras accionas individualmente D24 y D36–D40. Verifica la correspondencia física de cada contacto. Comprueba también las tres entradas de nivel D25–D27. En operación, un nivel de lleno sostenido durante 350 ms requiere revisión. Estas entradas son independientes del único IR de paso. El automático utiliza las tres y los cinco finales de posición de R2. Si faltan, aún puedes probar el IR y las lecturas manuales con `MEDIR`. Para mover el brazo por comandos se necesitan desde el principio los dos finales de la corredera.
2. Coloca el brazo en su reposo calibrado, la corredera en cerrada, la canaleta en un destino conocido y deja libre el IR. Comprueba en `ESTADO` que D39 está activo, D40 libre y solo uno de D36–D38 activo. Con el recorrido despejado, alimenta los servos y ordena por separado `SALIDA I`, `SALIDA C` y `SALIDA D`. Espera cada movimiento y mira a qué cajón apunta realmente. Registra **10° → D36**, **90° → D37** y **170° → D38**. Si el ángulo se alcanza pero el contacto incorrecto cierra, revisa la correspondencia mecánica o los cables antes de seguir.
3. Con el selector asentado, usa `PUERTA A` para abrir hasta **60°** y comprueba D40 activo y D39 libre. Usa `PUERTA C` para cerrar hasta **130°** y comprueba D39 activo y D40 libre. Observa que la corredera complete la carrera sin forzar al S3003 al final del movimiento. Mantén manos y herramientas fuera de la trayectoria. Si se atasca, corta la potencia para despejarla.
4. Una vez comprobados los tres destinos y ambas posiciones de la corredera, envía `VALIDAR SALIDA` y `GUARDAR`. Revisa `PERFIL`. Para habilitar el automático deben aparecer `validado_brazo=1`, `validado_ir=1`, `validado_salida=1` y `guardado=1`. Puedes guardar un borrador incompleto para continuar otro día. Al modificar una pose, un límite o la polaridad del IR, repite las validaciones que vuelvan a cero y termina con `GUARDAR`. Anota tus medidas en las tablas para reconstruirlas tras un cambio de placa. Para dejar los servos sin pulsos, sostén el brazo y envía `BANCO` entre ciclos. Durante un movimiento, D41 es la entrada local de servicio y el corte físico interrumpe la potencia.

## 5. Ensayar la clasificación y activar el automático

1. Sostén el brazo, envía `BANCO` para desconectar las seis señales de servo y corta la alimentación de potencia. Con D24 libre, envía `MEDIR`. El ensayo requiere que todos los servos estén desacoplados por software. Sigue la LCD y, en cada punto, apoya la sonda dentro de **10 s**, mantén el contacto mientras mide y levántala al recibir el aviso. Con una pieza seca y después con la misma pieza humedecida, recoge los eventos por USB. Cada punto válido debe incluir 15 lecturas A0, su mediana y la diferencia entre la mayor y la menor. Con la sonda suspendida, puedes leer A0 al aire mediante `ESTADO`.
2. La regla inicial considera húmeda una mediana de **0–929** y seca una de **932–1018**. Una mediana de **930–931**, aire/saturación **1019–1023**, dispersión superior a **25** cuentas, falta de contacto o una serie incompleta hacen dudoso ese punto. En automático se mide en tres puntos, se esperan 300 ms tras el contacto y se toman 15 lecturas a intervalos de 20 ms. Si el primer barrido no concuerda, se repite completo una vez. Si el segundo tampoco da tres clases válidas iguales, la pieza va a rechazo. Humedad y clase de material solo se relacionan por esta regla del prototipo. Un envase mojado puede ir al cajón húmedo. Contrasta estas reglas con muestras etiquetadas antes de interpretar estadísticas.
3. Al arrancar o reiniciar, verifica que la cámara esté despejada, los cajones tengan capacidad, la corredera esté cerrada, el selector esté asentado, el IR y D24 estén libres y el brazo esté **físicamente en el reposo guardado**. El brazo carece de realimentación de ángulo. Comprueba que el HC-SR04 da tres ecos válidos de cámara vacía por encima de 12 cm. Alimenta los servos y envía `AUTO` con el perfil ya guardado. Espera el mensaje de disponibilidad antes de colocar la primera pieza.
4. Deposita una sola pieza. Tres ecos de entrada a **10 cm o menos** inician el ciclo. La primera tarjeta se reserva en memoria y debe retirarse dentro de la ventana de 15 s desde la detección. Si la tarjeta falta o permanece en el lector, la separación física puede completarse y las mediciones quedan disponibles sin abono. Al terminar, deja la cámara despejada para que SPING pueda admitir otra pieza.
5. Verifica un húmedo, un seco y un rechazo observando el cajón real. Después prueba una descarga sin tarjeta, una tarjeta que permanece en el lector y una descarga sin caída confirmada. El rechazo conserva sus mediciones sin UID. Un atasco, una posición contradictoria o una parada por servicio requieren inspección. Si la salida queda obstruida, corta la potencia y despeja el paso antes de reiniciar. Tras revisar el equipo, suelta D41, reinicia y vuelve a comprobar el montaje desde banco.

## 6. Conectar el puente USB y comprobar los puntos

El Mega entrega por USB el resultado físico. El puente debe interpretar las líneas JSON de `evento` igual a `ciclo` con `version` igual a `3`. Las líneas que empiezan por `#` son del monitor. El evento identifica `sesion` y `ciclo_local`, contiene las series de `mediciones` y distingue el `destino` seleccionado (0 izquierda, 1 centro, 2 derecha, −1 sin selección) de `selector_confirmado`, `caida_confirmada` y `cierre_confirmado`. `destino_observado` vale `null` porque el único IR común está en la salida de la canaleta. Cuando se envía a rechazo, `motivo_rechazo` distingue discrepancia entre puntos (`SIN_CONSENSO`) de una medición inválida (`PUNTO_INVALIDO`). En un evento `COMPLETO` de izquierda o derecha puede aparecer `uid`. Un fallo, un rechazo y un ensayo de banco se conservan como telemetría sin asociar la tarjeta.

El puente debe conservar el evento recibido, asignarle un UUID estable y reutilizarlo en los reintentos. El puente valida las confirmaciones físicas y las lecturas del último barrido. La ruta de la web autentica el puente, valida los valores enviados e invoca la RPC de clasificación idempotente con el UUID. Comprueba en la instancia de prueba que la RPC acredita una sola vez tras un reintento. Los roles de usuario, mantenimiento y superusuario corresponden a la plataforma. Las claves privilegiadas se guardan del lado servidor. El botón D41 solicita revisión local.

Si `ESTADO` muestra `sesion=0`, la placa no pudo obtener un identificador fiable de su EEPROM y bloquea `AUTO`. Copia los valores de `PERFIL` antes de intervenir. Si reemplazas la placa o borras la EEPROM, asigna una nueva identidad de dispositivo en el puente antes de reanudar los abonos para evitar que la numeración reiniciada coincida con la anterior.

Cuando el servidor confirme el abono, el puente escribe `CREDITO <sesion> <ciclo_local>` con los dos números del evento y salto de línea. El firmware espera hasta **5 s** para mostrar el abono en la LCD. Ante pérdida de red el puente puede reintentar con el mismo UUID. Un abono confirmado después de esa ventana se consulta en la plataforma. Si el Mega se reinicia antes de emitir, se pierde el evento pendiente en su RAM. Para probar la integración, reenvía el mismo evento tras una respuesta perdida y verifica que el saldo cambie una sola vez.

## Cambios frente a SPING R2

Para corregir el brazo o invertir la polaridad del IR, repite los pasos 2–4 desde el monitor serie y guarda el perfil. Si cambias el montaje del selector o de la corredera, los ángulos fijos se encuentran en `ANGULO_SELECTOR`, `ANGULO_CERRADA` y `ANGULO_ABIERTA` de `Equipo.cpp`. En ese archivo, `PULSO_MIN_US` fija la duración mínima de paso. La regla del YL-69 está en `clase()` de `Calibracion.h`. Tras editar el código, vuelve a compilar para el Mega, sube el sketch y repite la prueba física correspondiente. La EEPROM puede conservar el perfil de la instalación anterior.

| Aspecto | R2 experimental | Firmware definitivo |
| --- | --- | --- |
| Caída | Tres entradas de paso por cajón, con polaridad fija | Un IR común en D2, polaridad medida y validación de un paso completo. Se informa la posición confirmada del selector y el paso por la salida. |
| Canaleta y corredera | Canaleta 55°/90°/125°. Corredera 80° cerrada y 125° abierta | Canaleta 10°/90°/170°. S3003 130° cerrada y 60° abierta. Pruebas individuales con sus finales. |
| Brazo | Poses provisionales en el código y habilitación al recompilar | Poses y límites obtenidos en el montaje, edición por monitor serie, validación y almacenamiento en EEPROM. Arranque en banco incluso con perfil guardado. |
| Sonda y llenado | El banco emitía mediana y dispersión `-1`. Una lectura de cajón lleno podía enclavar un fallo | El banco calcula las estadísticas para series completas. Los sensores de llenado se comprueban con persistencia temporal. |
| Tarjeta y puntos | Reservaba la primera tarjeta. La LCD informaba de entrega por USB | Se comprueba la retirada de la primera tarjeta. La confirmación del puente se relaciona con sesión y ciclo antes de mostrar el abono. |
