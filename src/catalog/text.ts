/**
 * Remove acentos e normaliza caixa para comparação.
 *
 * O catálogo tem "Ibrahimović", "Nazário", "Süper Lig". Sem isto, buscar
 * "ibrahimovic" não encontraria nada — e é assim que a maioria digita.
 */
export function foldText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Índice de busca de uma carta: nome, clube e versão em um só campo. */
export function buildSearchText(parts: (string | null)[]): string {
  return foldText(parts.filter((p): p is string => p !== null).join(' '));
}
