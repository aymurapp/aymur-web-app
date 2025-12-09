/**
 * Welcome Header Component
 *
 * Client component for the dashboard welcome header.
 * Uses Ant Design Typography components which require client-side rendering.
 *
 * @module components/domain/dashboard/WelcomeHeader
 */

'use client';

import { Typography } from 'antd';

const { Title, Text } = Typography;

interface WelcomeHeaderProps {
  /** Name of the shop to display */
  shopName: string;
  /** Welcome text (translated) */
  welcomeText: string;
  /** Subtitle text (translated) */
  subtitleText: string;
}

/**
 * Welcome Header Section
 *
 * Displays a welcome message with the shop name and a subtitle.
 */
export function WelcomeHeader({ shopName, welcomeText, subtitleText }: WelcomeHeaderProps) {
  return (
    <div className="mb-6">
      <Title level={2} className="!mb-1 !text-stone-900 dark:!text-stone-100">
        {welcomeText} {shopName}
      </Title>
      <Text type="secondary" className="text-base">
        {subtitleText}
      </Text>
    </div>
  );
}
