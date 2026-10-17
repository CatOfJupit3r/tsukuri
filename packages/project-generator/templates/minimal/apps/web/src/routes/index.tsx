import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: HomePage,
});

function HomePage() {
  return (
    <main>
      <section>
        <h1>startername</h1>
        <p>Your project foundation is ready. Start building in apps/web/src.</p>
      </section>
    </main>
  );
}
