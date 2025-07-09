/**
 * Funciones de memoria vectorial para mejorar el contexto.
 */

function generarEmbedding(texto) {
  try {
    // El modelo admite hasta MAX_TOKENS_EMBEDDING tokens
    const totalTokens = contarTokens(texto);
    if (totalTokens > MAX_TOKENS_EMBEDDING) {
      logError('Memoria', 'generarEmbedding', `Texto supera el límite de ${MAX_TOKENS_EMBEDDING} tokens`);
      texto = limitarTexto(texto, MAX_TOKENS_EMBEDDING);
    }
    const url = 'https://api.openai.com/v1/embeddings';
    const payload = {
      model: EMBEDDING_MODEL,
      input: texto
    };
    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'Bearer ' + OPENAI_API_KEY },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    const resp = UrlFetchApp.fetch(url, options);
    if (resp.getResponseCode() !== 200) {
      logError('Memoria', 'generarEmbedding', `Error (${resp.getResponseCode()}): ${resp.getContentText()}`);
      return null;
    }
    const data = JSON.parse(resp.getContentText());
    return data.data && data.data[0] && data.data[0].embedding ? data.data[0].embedding : null;
  } catch (e) {
    logError('Memoria', 'generarEmbedding', e.message, e.stack, texto);
    return null;
  }
}

function almacenarVector(textoOriginal, embeddingVector, userId) {
  try {
    const vectorId = `VEC-${new Date().getTime()}-${Math.floor(Math.random() * 1000)}`;
    appendRowToSheet(SHEET_NAMES.MEMORIA_VECTORIAL, {
      VectorID: vectorId,
      UsuarioID: userId,
      TextoOriginal: textoOriginal,
      Embedding: JSON.stringify(embeddingVector),
      FechaHora: getFormattedTimestamp()
    });
  } catch (e) {
    logError('Memoria', 'almacenarVector', e.message, e.stack, textoOriginal);
  }
}

function calcularSimilitudCoseno(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < vecA.length; i++) {
    const a = parseFloat(vecA[i]);
    const b = parseFloat(vecB[i]);
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

function buscarContextoRelevante(consulta, userId) {
  try {
    const consultaVector = generarEmbedding(consulta);
    if (!consultaVector) return '';
    const memoria = getSheetData(SHEET_NAMES.MEMORIA_VECTORIAL).filter(r => String(r.UsuarioID) === String(userId));
    const candidatos = memoria.map(r => {
      let vec = [];
      try {
        vec = JSON.parse(r.Embedding);
      } catch (e) {
        vec = [];
      }
      return { texto: r.TextoOriginal, similitud: calcularSimilitudCoseno(consultaVector, vec) };
    }).sort((a, b) => b.similitud - a.similitud).slice(0, 3);
    return candidatos.map(c => c.texto).join('\n');
  } catch (e) {
    logError('Memoria', 'buscarContextoRelevante', e.message, e.stack, consulta);
    return '';
  }
}
