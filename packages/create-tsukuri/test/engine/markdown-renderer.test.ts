import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { createGeneratorContainer } from '#~/di/container';
import { MarkdownRenderer } from '#~/engine/markdown-renderer';
import { MARKDOWN_DOCUMENTS } from '#~/enums/markdown-documents.enums';
import { moduleManifestSchema } from '#~/manifest/module-manifest.schema';

import { createManifest, testModuleId } from '../helpers/manifests';
import { useTempDir } from '../helpers/temp-dir';

vi.mock('#~/enums/module-ids.enums', () => import('../helpers/test-module-ids'));

const FRAGMENT_SOURCE = 'fragments/agents.md.hbs';

const FRAGMENT = ['# {{projectName}}', '<private>', 'Private notes', '</private>'].join('\n');

describe('MarkdownRenderer', () => {
  const createTempDir = useTempDir();

  async function renderAgentsDocuments(includePrivate: boolean) {
    const sourceRoot = await createTempDir();
    await mkdir(path.join(sourceRoot, 'fragments'));
    await writeFile(path.join(sourceRoot, FRAGMENT_SOURCE), FRAGMENT);

    const base = moduleManifestSchema.parse(
      createManifest(testModuleId('base'), {
        markdown: [{ document: MARKDOWN_DOCUMENTS.AGENTS, source: FRAGMENT_SOURCE }],
      }),
    );
    const renderer = createGeneratorContainer({ sourceRoot, manifests: [] }).resolve(MarkdownRenderer);
    const documents = await renderer.render(
      [base],
      { installedModules: [base.id], projectName: 'acme' },
      { includePrivate },
    );

    return new Map(documents.map((document) => [document.path, document.content]));
  }

  it('writes AGENTS.md with its frontmatter and drops private blocks by default', async () => {
    const documents = await renderAgentsDocuments(false);

    expect([...documents.keys()]).toEqual(['AGENTS.md']);
    expect(documents.get('AGENTS.md')).toBe("---\napplyTo: '**/*.ts'\n---\n\n# acme\n");
  });

  it('keeps private blocks only when the record includes them', async () => {
    const documents = await renderAgentsDocuments(true);

    expect(documents.get('AGENTS.md')).toBe("---\napplyTo: '**/*.ts'\n---\n\n# acme\nPrivate notes\n");
  });
});
