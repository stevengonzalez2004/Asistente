const groqService = require('./groqService');
const logger = require('../utils/logger');

class IaService {
  constructor() {
    this.systemPrompt = `
Eres un asistente financiero inteligente experto, diseñado para procesar el lenguaje natural y devolver ÚNICAMENTE un formato JSON válido.
Analiza el mensaje del usuario y extrae la intención y entidades financieras asociadas de acuerdo a las siguientes reglas:

1. INTENCIONES (intent):
   - "registrar_movimiento": Cuando el usuario indica un ingreso, gasto o transferencia (ej. "gasté 10 en taxi", "me pagaron 500", "transferí 100 de banco a ahorros").
   - "consultar_balance": Consultar el saldo general o saldo de una cuenta específica (ej. "¿cuánto dinero tengo?", "¿cuál es mi saldo en banco?").
   - "consultar_gastos": Consultar gastos realizados en general (ej. "¿cuánto he gastado?", "muestra mis gastos").
   - "consultar_ingresos": Consultar ingresos realizados en general (ej. "¿cuánto ha ingresado?").
   - "consultar_categoria": Consultar cuánto se gastó o ingresó en una categoría específica (ej. "¿cuánto gasté en comida?", "gastos en taxi").
   - "consultar_hoy": Consultar movimientos del día de hoy (ej. "¿qué gasté hoy?", "movimientos de hoy").
   - "consultar_mes": Consultar movimientos de este mes (ej. "¿cuánto llevo este mes?").
   - "saludo": Mensajes de saludo casuales (ej. "hola", "buenos días").
   - "ayuda": Petición de ayuda o comandos (ej. "¿qué puedes hacer?", "ayuda").

2. TIPOS DE MOVIMIENTO (tipo):
   - "GASTO": Si indica salida de dinero (gastar, pagar, comprar, taxi, almuerzo, etc.).
   - "INGRESO": Si indica entrada de dinero (recibir pago, sueldo, me pagaron, gané, depositaron, etc.).
   - "TRANSFERENCIA": Si indica mover dinero entre cuentas (transferí 100 de efectivo a banco, pasar dinero, etc.).
   - null si no aplica.

3. CATEGORÍAS (categoria):
   - Clasifica en una de las categorías por defecto: "Comida", "Transporte", "Servicios", "Salud", "Entretenimiento", "Educación", "Compras", "Salario", "Inversión", o "Otros".
   - Si no se menciona o infiere, usa null.

4. MONTO (monto):
   - Extrae el valor numérico absoluto (ej. 25, 100.50). Si no hay monto, usa null.

5. CUENTAS (cuenta_origen / cuenta_destino):
   - cuenta_origen: Cuenta desde donde sale el dinero. Cuentas comunes: "Efectivo", "Tarjeta", "Banco", "Ahorros".
     - Si es un GASTO, asume por defecto "Efectivo" si no se menciona un método de pago. Si menciona "tarjeta", usa "Tarjeta". Si menciona "banco" o "transferencia", usa "Banco".
     - Si es una TRANSFERENCIA, identifica la cuenta origen (ej. "de banco a ahorros" -> cuenta_origen="Banco").
   - cuenta_destino: Cuenta a donde entra el dinero.
     - Si es un INGRESO, identifica dónde entra. Por defecto, si no se especifica, usa "Efectivo" o "Banco" según contexto.
     - Si es una TRANSFERENCIA, identifica la cuenta de destino (ej. "de banco a ahorros" -> cuenta_destino="Ahorros").

6. DESCRIPCIÓN (descripcion):
   - Breve detalle del movimiento (ej. "pizza", "taxi", "netflix", "sushi con amigos"). Si no se especifica, usa null.

7. MÉTODO DE PAGO (metodo_pago):
   - "EFECTIVO", "TARJETA", "TRANSFERENCIA" o null.

8. RESPUESTA CONVERSACIONAL (respuesta_conversacional):
   - Redacta una respuesta muy corta, atenta y amigable en español para saludos, ayuda, o cuando el usuario hace preguntas generales no estructurables. Si es una instrucción directa de registro, puedes dejarlo como null o una confirmación preliminar.

IMPORTANTE:
- Debes responder EXCLUSIVAMENTE con el objeto JSON.
- No agregues introducciones, explicaciones, ni bloques de código (sin markdown \`\`\`json).
- El JSON debe tener exactamente esta estructura:
{
  "intent": string,
  "tipo": string | null,
  "categoria": string | null,
  "monto": number | null,
  "metodo_pago": string | null,
  "cuenta_origen": string | null,
  "cuenta_destino": string | null,
  "descripcion": string | null,
  "respuesta_conversacional": string | null
}
`;
  }

  /**
   * Procesa el texto del usuario para clasificar la intención y extraer las entidades financieras.
   * @param {string} text - Mensaje enviado por el usuario.
   * @returns {Object} JSON estructurado con el resultado de la extracción.
   */
  async procesarMensaje(text) {
    try {
      const messages = [
        { role: 'system', content: this.systemPrompt },
        { role: 'user', content: `Analiza este mensaje: "${text}"` }
      ];

      const rawResult = await groqService.getChatCompletion(messages, {
        temperature: 0.0,
        jsonMode: true
      });

      const responseText = rawResult.choices[0]?.message?.content?.trim();
      logger.debug('Respuesta cruda de GROQ NLP:', responseText);

      // Limpiar markdown si el modelo no hizo caso y lo incluyó
      let cleanedText = responseText;
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      let parsedData;
      try {
        parsedData = JSON.parse(cleanedText);
      } catch (parseError) {
        logger.warn('Error al parsear el JSON de la IA. Intentando recuperación manual por expresiones regulares.', parseError);
        parsedData = this.recuperarJsonFallido(cleanedText, text);
      }

      // Validar campos requeridos y tipos
      return this.normalizarDatosExtraidos(parsedData, text);
    } catch (error) {
      logger.error('Error al procesar mensaje con la IA:', error);
      return this.obtenerFallbackError(text, error.message);
    }
  }

  /**
   * Intenta recuperar datos en caso de que la respuesta no sea JSON válido.
   */
  recuperarJsonFallido(rawText, originalText) {
    // Intenta buscar el bloque {...} en el texto
    const match = rawText.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (e) {
        logger.error('No se pudo recuperar el JSON con expresiones regulares');
      }
    }

    // Retorna fallback básico
    return {
      intent: 'ayuda',
      tipo: null,
      categoria: null,
      monto: null,
      metodo_pago: null,
      cuenta_origen: null,
      cuenta_destino: null,
      descripcion: null,
      respuesta_conversacional: 'Lo siento, no he podido procesar tu solicitud adecuadamente. ¿Podrías repetirlo de otra manera?'
    };
  }

  /**
   * Normaliza los datos extraídos para asegurar tipos consistentes.
   */
  normalizarDatosExtraidos(data, originalText) {
    const defaultStructure = {
      intent: 'ayuda',
      tipo: null,
      categoria: null,
      monto: null,
      metodo_pago: null,
      cuenta_origen: null,
      cuenta_destino: null,
      descripcion: null,
      respuesta_conversacional: null
    };

    const normal = { ...defaultStructure, ...data };

    // Validar intenciones válidas
    const intencionesValidas = [
      'registrar_movimiento', 'consultar_balance', 'consultar_gastos',
      'consultar_ingresos', 'consultar_categoria', 'consultar_hoy',
      'consultar_mes', 'saludo', 'ayuda'
    ];
    if (!intencionesValidas.includes(normal.intent)) {
      normal.intent = 'ayuda';
    }

    // Validar tipos
    const tiposValidos = ['INGRESO', 'GASTO', 'TRANSFERENCIA'];
    if (normal.tipo && !tiposValidos.includes(normal.tipo.toUpperCase())) {
      normal.tipo = null;
    } else if (normal.tipo) {
      normal.tipo = normal.tipo.toUpperCase();
    }

    // Convertir monto a número flotante si existe
    if (normal.monto !== null && normal.monto !== undefined) {
      const parsedMonto = parseFloat(normal.monto);
      normal.monto = isNaN(parsedMonto) ? null : parsedMonto;
    }

    // Validar categoría (Mayúscula en la primera letra)
    if (normal.categoria) {
      normal.categoria = normal.categoria.charAt(0).toUpperCase() + normal.categoria.slice(1).toLowerCase();
    }

    // Lógica adicional para cuenta por defecto
    if (normal.intent === 'registrar_movimiento' && normal.tipo === 'GASTO' && !normal.cuenta_origen) {
      if (normal.metodo_pago === 'TARJETA') {
        normal.cuenta_origen = 'Tarjeta';
      } else if (normal.metodo_pago === 'TRANSFERENCIA') {
        normal.cuenta_origen = 'Banco';
      } else {
        normal.cuenta_origen = 'Efectivo';
      }
    }
// Limpiar caracteres especiales de Markdown en la descripción
    if (normal.descripcion) {
      normal.descripcion = normal.descripcion.replace(/[_*[\]`]/g, '').trim();
    }
    return normal;
  }

  /**
   * Retorna objeto fallback estructurado si todo lo demás falla.
   */
  obtenerFallbackError(text, errorMessage) {
    return {
      intent: 'ayuda',
      tipo: null,
      categoria: null,
      monto: null,
      metodo_pago: null,
      cuenta_origen: null,
      cuenta_destino: null,
      descripcion: null,
      respuesta_conversacional: `Upps, tuve un problema al procesar tu solicitud. Error técnico: ${errorMessage}`
    };
  }

  /**
   * Clasifica la explicación del usuario sobre de dónde provienen los fondos faltantes.
   * @param {string} mensajeUsuario - Respuesta del usuario (ej: "me los prestaron").
   * @param {number} faltante - Monto faltante.
   * @param {string} cuenta - Cuenta donde hace falta el dinero.
   * @returns {Object} JSON con { tipo_procedencia, categoria, cuenta_origen, descripcion }
   */
  async analizarProcedenciaFondos(mensajeUsuario, faltante, cuenta) {
    try {
      const prompt = `
Eres un asistente financiero inteligente. El usuario intentó registrar un gasto/transferencia en su cuenta '${cuenta}' pero no tenía saldo suficiente (le faltan $${faltante.toFixed(2)}).
Le preguntamos de dónde provienen esos $${faltante.toFixed(2)} y el usuario respondió: "${mensajeUsuario}".

Tu tarea es clasificar la procedencia de esos fondos en una de las siguientes categorías de forma amigable y profesional:

1. "INGRESO": El usuario indica que es dinero nuevo (ej: "me los prestaron", "es de mi sueldo", "me lo regalaron", "me los dio mi papá", "los gané en un trabajo", "me gané la lotería").
   - tipo_procedencia: "INGRESO"
   - categoria: Clasifícalo en una categoría apropiada de ingresos (ej: "Préstamo", "Salario", "Regalo", "Otros").
   - descripcion: Una descripción corta y clara de la procedencia (ej: "Préstamo de un amigo", "Regalo familiar", etc.).

2. "TRANSFERENCIA": El usuario indica que usó dinero de otra cuenta suya (ej: "lo saqué del banco", "lo pasé de mi cuenta de ahorros", "usa la tarjeta", "de banco", "del colchón").
   - tipo_procedencia: "TRANSFERENCIA"
   - cuenta_origen: Nombre de la otra cuenta de donde proviene el dinero. Identifícalo entre: "Banco", "Tarjeta", "Ahorros" o "Efectivo". Si no está claro, asume "Banco".
   - descripcion: "Traspaso por saldo insuficiente".

3. "FORZAR": El usuario no especifica procedencia o pide que se registre de todos modos sin importar el saldo negativo (ej: "no sé", "no importa", "así déjalo", "regístralo igual", "cárgalo en negativo", "no me importa el saldo").
   - tipo_procedencia: "FORZAR"

4. "CANCELAR": El usuario desea cancelar la operación (ej: "cancela", "no lo hagas") 
   O TAMBIÉN si el usuario cambia completamente de tema, hace una pregunta diferente, o pide un reporte (ej: "gastos del día", "¿cuánto tengo?", "registra otra cosa"). Si la respuesta no tiene lógica como fuente de dinero, asume CANCELAR.
   - tipo_procedencia: "CANCELAR"

Devuelve EXCLUSIVAMENTE un objeto JSON válido con la siguiente estructura (sin markdown \`\`\`json y sin explicaciones):
{
  "tipo_procedencia": "INGRESO" | "TRANSFERENCIA" | "FORZAR" | "CANCELAR",
  "categoria": string | null,
  "cuenta_origen": string | null,
  "descripcion": string | null
}
`;

      const messages = [
        { role: 'system', content: prompt },
        { role: 'user', content: `Respuesta del usuario: "${mensajeUsuario}"` }
      ];

      const rawResult = await groqService.getChatCompletion(messages, {
        temperature: 0.0,
        jsonMode: true
      });

      const responseText = rawResult.choices[0]?.message?.content?.trim();
      logger.debug('Respuesta de GROQ para procedencia de fondos:', responseText);

      let cleanedText = responseText;
      if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```json\s*/i, '').replace(/```$/, '').trim();
      }

      const parsed = JSON.parse(cleanedText);
      return {
        tipo_procedencia: parsed.tipo_procedencia || 'FORZAR',
        categoria: parsed.categoria || null,
        cuenta_origen: parsed.cuenta_origen || null,
        descripcion: parsed.descripcion || 'Procedencia sin especificar'
      };
    } catch (error) {
      logger.error('Error al analizar procedencia de fondos con la IA:', error);
      return {
        tipo_procedencia: 'FORZAR',
        categoria: null,
        cuenta_origen: null,
        descripcion: 'Error al analizar procedencia, procediendo con forzado'
      };
    }
  }
}

module.exports = new IaService();
