import { createHash } from 'node:crypto';

/** Namespace fixo do projeto. Trocá-lo muda todos os IDs públicos. */
const NAMESPACE = '6f9619ff-8b86-d011-b42d-00cf4fc964ff';

function hexToBytes(hex: string): Buffer {
  return Buffer.from(hex.replace(/-/g, ''), 'hex');
}

/**
 * UUID v5 determinístico a partir de `source` + `source_id`.
 *
 * O contrato público expõe um ID interno, não o ID da fonte (ARCHITECTURE
 * §11) — assim trocar ou somar fontes não quebra consumidores. Sem banco
 * não há coluna que gere esse ID, então ele é derivado: o mesmo par produz
 * sempre o mesmo UUID, em qualquer máquina e a cada deploy.
 *
 * Estabilidade importa: o inventário do jogo guarda esses IDs. Se mudassem
 * a cada publicação, as cartas dos jogadores apontariam para o nada.
 */
export function cardId(source: string, sourceId: string): string {
  const hash = createHash('sha1')
    .update(hexToBytes(NAMESPACE))
    .update(`${source}:${sourceId}`, 'utf8')
    .digest();

  const bytes = Buffer.from(hash.subarray(0, 16));

  // Versão 5 nos 4 bits altos do byte 6; variante RFC 4122 no byte 8.
  bytes[6] = ((bytes[6] as number) & 0x0f) | 0x50;
  bytes[8] = ((bytes[8] as number) & 0x3f) | 0x80;

  const hex = bytes.toString('hex');

  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}
