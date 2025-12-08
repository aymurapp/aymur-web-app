'use client';

import Link from 'next/link';

import { Button, Typography } from 'antd';
import { useTranslations } from 'next-intl';

const { Title, Paragraph } = Typography;

/**
 * Marketing Landing Page
 *
 * Main landing page for the Aymur platform.
 * Showcases features and provides CTA to sign up.
 */
export default function LandingPage() {
  const t = useTranslations('marketing');

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      {/* Hero Section */}
      <header className="relative overflow-hidden">
        {/* Navigation */}
        <nav className="container mx-auto px-4 py-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center">
              <svg
                className="w-6 h-6 text-white"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <polygon points="12 2 2 9 12 22 22 9" />
              </svg>
            </div>
            <span className="text-2xl font-bold text-stone-800">Aymur</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login">
              <Button type="text" size="large">
                {t('login')}
              </Button>
            </Link>
            <Link href="/register">
              <Button type="primary" size="large">
                {t('getStarted')}
              </Button>
            </Link>
          </div>
        </nav>

        {/* Hero Content */}
        <div className="container mx-auto px-4 py-20 text-center">
          <Title level={1} className="!text-4xl md:!text-6xl !font-bold !text-stone-800 !mb-6">
            {t('heroTitle')}
          </Title>
          <Paragraph className="text-xl text-stone-600 max-w-2xl mx-auto mb-10">
            {t('heroSubtitle')}
          </Paragraph>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/register">
              <Button type="primary" size="large" className="h-14 px-8 text-lg">
                {t('startFreeTrial')}
              </Button>
            </Link>
            <Link href="#features">
              <Button size="large" className="h-14 px-8 text-lg">
                {t('learnMore')}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <Title level={2} className="!text-3xl !font-bold !text-center !text-stone-800 !mb-12">
            {t('featuresTitle')}
          </Title>
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon="inventory"
              title={t('feature1Title')}
              description={t('feature1Desc')}
            />
            <FeatureCard icon="sales" title={t('feature2Title')} description={t('feature2Desc')} />
            <FeatureCard
              icon="analytics"
              title={t('feature3Title')}
              description={t('feature3Desc')}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-amber-500">
        <div className="container mx-auto px-4 text-center">
          <Title level={2} className="!text-3xl !font-bold !text-white !mb-6">
            {t('ctaTitle')}
          </Title>
          <Paragraph className="text-xl text-amber-100 mb-8">{t('ctaSubtitle')}</Paragraph>
          <Link href="/register">
            <Button size="large" className="h-14 px-8 text-lg bg-white text-amber-600">
              {t('getStartedFree')}
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 bg-stone-900 text-stone-400">
        <div className="container mx-auto px-4 text-center">
          <p>
            &copy; {new Date().getFullYear()} Aymur. {t('allRightsReserved')}
          </p>
        </div>
      </footer>
    </div>
  );
}

/**
 * Feature Card Component
 */
function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: string;
  title: string;
  description: string;
}) {
  const getIcon = () => {
    switch (icon) {
      case 'inventory':
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
        );
      case 'sales':
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="3" width="20" height="14" rx="2" />
            <path d="M8 21h8M12 17v4" />
          </svg>
        );
      case 'analytics':
        return (
          <svg
            className="w-8 h-8"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M18 20V10M12 20V4M6 20v-6" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-8 rounded-2xl bg-stone-50 hover:bg-amber-50 transition-colors">
      <div className="w-16 h-16 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center mb-6">
        {getIcon()}
      </div>
      <Title level={4} className="!text-xl !font-semibold !text-stone-800 !mb-3">
        {title}
      </Title>
      <Paragraph className="text-stone-600">{description}</Paragraph>
    </div>
  );
}
