import { createFileRoute } from '@tanstack/react-router';
import { HiOutlineSparkles } from 'react-icons/hi';
import { LuRocket, LuServerCog } from 'react-icons/lu';

import { Card, CardContent } from '#~/components/ui/layout/card';
import { webSlots } from '#~/lib/web-slots';

export const Route = createFileRoute('/')({
  component: HomeComponent,
});

const FEATURES = [
  {
    title: 'Contract-first approach',
    description: 'Start building with clear API contracts using oRPC',
    icon: <LuServerCog className="size-8" />,
  },
  {
    title: 'Shiny new tech',
    description: 'Built with Node.js, React, TanStack Router, and more modern technologies.',
    icon: <HiOutlineSparkles className="size-8" />,
  },
  {
    title: 'Ready-to-use template',
    description: 'Jumpstart your project with a full-stack starter template.',
    icon: <LuRocket className="size-8" />,
  },
];

function FeatureCard({ feature }: { feature: (typeof FEATURES)[number] }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="mb-4 text-primary">{feature.icon}</div>
        <h3 className="mb-2 font-semibold text-foreground">{feature.title}</h3>
        <p className="text-sm text-muted-foreground">{feature.description}</p>
      </CardContent>
    </Card>
  );
}

function HomeComponent() {
  return (
    <div className="min-h-[calc(100vh-4rem)] overflow-y-auto bg-background">
      {/* Hero Section */}
      <section className="relative border-b border-border">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Main Headline */}
            <h1 className="text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
              Turn Ideas Into
              <br className="my-3" />
              <span className="bg-linear-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                SaaS Products
              </span>
            </h1>

            {/* Subheading */}
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Don&apos;t bother managing your own setup. Launch your next project with our full-stack starter template
              built with Node.js, React, TanStack Router, and oRPC.
            </p>

            {webSlots.HOME_SECTIONS.map((Section) => (
              <Section key={Section.name} />
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="border-b border-border py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto mb-12 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">Everything You Need!</h2>
            <p className="mt-4 text-lg text-muted-foreground">Built for developers.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} feature={feature} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
