# create-tsukuri

Creates a pnpm monorepo from tsukuri modules, and adds or removes modules in a project it created.

```bash
pnpm create tsukuri my-app
```

Every choice is a prompt, and every prompt has a flag; `--help` lists them, and the summary prints the equivalent command. `--yes` accepts the defaults.

Inside a generated project (or with `--dir <project>`), change its modules and skills:

```bash
pnpm create tsukuri add <module-id...>
pnpm create tsukuri remove <module-id...>
pnpm create tsukuri add skill <skill-id...>
```

`--dry-run` lists the changes without writing them.

The project records what it was generated from in `starter.json`, so `add` and `remove` regenerate the files where modules meet and keep your own edits.

Requires Node.js 26 and pnpm 12.
