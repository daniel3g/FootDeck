import { describe, expect, it } from 'vitest';
import { app } from '../../src/app.js';

describe('GET /manual', () => {
  it('serve a página como HTML', async () => {
    const res = await app.request('/manual');

    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');

    const html = await res.text();
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<meta charset="utf-8">');
    expect(html).toContain('Manual de uso da');
  });

  it('é cacheável na borda', async () => {
    const res = await app.request('/manual');
    expect(res.headers.get('cache-control')).toContain('s-maxage=');
  });

  /**
   * O conteúdo vive numa template literal (manual.page.ts). Um backtick ou
   * um ${ escapando para lá quebraria o módulo inteiro, então a página é
   * verificada aqui: se um dia alguém colar código com backtick, o teste
   * aponta o motivo em vez de deixar um erro de sintaxe sem explicação.
   */
  it('não perdeu o final da página', async () => {
    const html = await (await app.request('/manual')).text();
    expect(html.trimEnd().endsWith('</html>')).toBe(true);
    expect(html).toContain('Rodando local');
  });

  it('não aparece no OpenAPI', async () => {
    const res = await app.request('/api/v1/openapi.json');
    const doc = (await res.json()) as { paths: Record<string, unknown> };

    expect(doc.paths['/manual']).toBeUndefined();
  });
});
