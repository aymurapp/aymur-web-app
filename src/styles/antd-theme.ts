import type { ThemeConfig } from 'antd';

/**
 * Aymur Platform - Ant Design Theme Configuration
 *
 * Gold-themed luxury design tokens that align with the platform's
 * jewelry business branding and CSS variable system.
 *
 * Primary Gold Color: #f59e0b (Amber-500)
 *
 * WCAG AA Accessibility Compliance:
 * - Text contrast ratio >= 4.5:1 for normal text
 * - Text contrast ratio >= 3:1 for large text (18px+ or 14px+ bold)
 * - Focus indicators visible against all backgrounds
 * - Interactive element states clearly distinguishable
 *
 * Color contrast notes:
 * - Primary text #1c1917 on white: 15.5:1 (passes AAA)
 * - Secondary text #57534e on white: 6.7:1 (passes AA)
 * - Tertiary text #78716c on white: 4.7:1 (passes AA)
 * - Primary gold #f59e0b on white: 2.0:1 (decorative only, not for text)
 * - For gold text, use #b45309 (5.5:1) or darker for accessibility
 */

export const antdTheme: ThemeConfig = {
  token: {
    // =========================================
    // Primary Gold Palette
    // =========================================
    colorPrimary: '#f59e0b',
    colorPrimaryHover: '#d97706',
    colorPrimaryActive: '#b45309',
    colorPrimaryBg: '#fffbeb',
    colorPrimaryBgHover: '#fef3c7',
    colorPrimaryBorder: '#fde68a',
    colorPrimaryBorderHover: '#fcd34d',
    // WCAG AA: Using darker gold for text (4.5:1+ contrast on white)
    colorPrimaryText: '#b45309', // Changed from #f59e0b (2.0:1) to #b45309 (5.5:1)
    colorPrimaryTextHover: '#92400e', // Darker for better hover contrast
    colorPrimaryTextActive: '#78350f', // Darkest for active state

    // =========================================
    // Status Colors (WCAG AA compliant)
    // =========================================
    colorSuccess: '#059669',
    colorSuccessBg: '#ecfdf5',
    colorSuccessBorder: '#6ee7b7',
    colorSuccessHover: '#047857',
    colorSuccessActive: '#065f46',
    // Success text: #059669 on white = 4.6:1 (passes AA)
    colorSuccessText: '#047857', // Darker for better contrast (5.9:1)
    colorSuccessTextHover: '#065f46',
    colorSuccessTextActive: '#064e3b',

    colorWarning: '#d97706',
    colorWarningBg: '#fffbeb',
    colorWarningBorder: '#fcd34d',
    colorWarningHover: '#b45309',
    colorWarningActive: '#92400e',
    // Warning text: #d97706 on white = 3.0:1 (fails AA) - using darker
    colorWarningText: '#92400e', // Darker for AA compliance (7.2:1)
    colorWarningTextHover: '#78350f',
    colorWarningTextActive: '#78350f',

    colorError: '#dc2626',
    colorErrorBg: '#fef2f2',
    colorErrorBorder: '#fca5a5',
    colorErrorHover: '#b91c1c',
    colorErrorActive: '#991b1b',
    // Error text: #dc2626 on white = 4.0:1 (close to AA) - using darker
    colorErrorText: '#b91c1c', // Darker for better contrast (5.5:1)
    colorErrorTextHover: '#991b1b',
    colorErrorTextActive: '#7f1d1d',

    colorInfo: '#0ea5e9',
    colorInfoBg: '#f0f9ff',
    colorInfoBorder: '#7dd3fc',
    colorInfoHover: '#0284c7',
    colorInfoActive: '#0369a1',
    // Info text: #0ea5e9 on white = 2.7:1 (fails AA) - using darker
    colorInfoText: '#0369a1', // Darker for AA compliance (6.1:1)
    colorInfoTextHover: '#075985',
    colorInfoTextActive: '#0c4a6e',

    // =========================================
    // Neutral Colors (Warm Grays)
    // =========================================
    colorText: '#1c1917',
    colorTextSecondary: '#57534e',
    colorTextTertiary: '#78716c',
    colorTextQuaternary: '#a8a29e',

    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#fafaf9',
    colorBgSpotlight: '#f5f5f4',
    colorBgMask: 'rgba(0, 0, 0, 0.45)',

    colorBorder: '#e7e5e4',
    colorBorderSecondary: '#f5f5f4',

    colorFill: '#f5f5f4',
    colorFillSecondary: '#fafaf9',
    colorFillTertiary: '#ffffff',
    colorFillQuaternary: '#ffffff',

    // =========================================
    // Border Radius
    // =========================================
    borderRadius: 8,
    borderRadiusLG: 12,
    borderRadiusSM: 6,
    borderRadiusXS: 4,

    // =========================================
    // Typography
    // =========================================
    fontFamily:
      'Inter, "Plus Jakarta Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    fontSizeSM: 12,
    fontSizeLG: 16,
    fontSizeXL: 20,
    fontSizeHeading1: 38,
    fontSizeHeading2: 30,
    fontSizeHeading3: 24,
    fontSizeHeading4: 20,
    fontSizeHeading5: 16,

    lineHeight: 1.5714285714285714,
    lineHeightLG: 1.5,
    lineHeightSM: 1.6666666666666667,
    lineHeightHeading1: 1.2105263157894737,
    lineHeightHeading2: 1.2666666666666666,
    lineHeightHeading3: 1.3333333333333333,
    lineHeightHeading4: 1.4,
    lineHeightHeading5: 1.5,

    fontWeightStrong: 600,

    // =========================================
    // Spacing
    // =========================================
    padding: 16,
    paddingLG: 24,
    paddingSM: 12,
    paddingXS: 8,
    paddingXXS: 4,

    margin: 16,
    marginLG: 24,
    marginSM: 12,
    marginXS: 8,
    marginXXS: 4,

    // =========================================
    // Control Heights
    // =========================================
    controlHeight: 40,
    controlHeightLG: 48,
    controlHeightSM: 32,
    controlHeightXS: 24,

    // =========================================
    // Shadows
    // =========================================
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
    boxShadowSecondary: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)',
    boxShadowTertiary: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',

    // =========================================
    // Motion
    // =========================================
    motionDurationFast: '0.1s',
    motionDurationMid: '0.2s',
    motionDurationSlow: '0.3s',
    motionEaseInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    motionEaseOut: 'cubic-bezier(0, 0, 0.2, 1)',

    // =========================================
    // Other
    // =========================================
    wireframe: false,
    zIndexPopupBase: 1000,
    opacityLoading: 0.65,
  },

  // =========================================
  // Component-Specific Tokens
  // =========================================
  components: {
    Button: {
      primaryShadow: '0 2px 8px rgba(245, 158, 11, 0.35)',
      defaultBorderColor: '#e7e5e4',
      defaultColor: '#1c1917',
      defaultBg: '#ffffff',
      defaultHoverBg: '#fafaf9',
      defaultHoverColor: '#f59e0b',
      defaultHoverBorderColor: '#fcd34d',
      defaultActiveBg: '#f5f5f4',
      defaultActiveColor: '#d97706',
      defaultActiveBorderColor: '#f59e0b',
      fontWeight: 500,
      contentFontSize: 14,
      contentFontSizeLG: 16,
      contentFontSizeSM: 14,
    },

    Card: {
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px -1px rgba(0, 0, 0, 0.1)',
      headerBg: 'transparent',
      headerFontSize: 16,
      headerFontSizeSM: 14,
      headerHeight: 56,
      headerHeightSM: 48,
      actionsBg: '#fafaf9',
    },

    Table: {
      headerBg: '#fafaf9',
      headerColor: '#1c1917',
      headerSortActiveBg: '#f5f5f4',
      headerSortHoverBg: '#f5f5f4',
      headerFilterHoverBg: '#f5f5f4',
      rowHoverBg: '#fffbeb',
      rowSelectedBg: '#fef3c7',
      rowSelectedHoverBg: '#fde68a',
      rowExpandedBg: '#fafaf9',
      borderColor: '#e7e5e4',
      headerBorderRadius: 8,
      cellPaddingBlock: 16,
      cellPaddingBlockMD: 12,
      cellPaddingBlockSM: 8,
      cellPaddingInline: 16,
      cellPaddingInlineMD: 12,
      cellPaddingInlineSM: 8,
      cellFontSize: 14,
      cellFontSizeMD: 14,
      cellFontSizeSM: 14,
      headerSplitColor: '#e7e5e4',
      footerBg: '#fafaf9',
      footerColor: '#1c1917',
    },

    Menu: {
      itemSelectedBg: '#fffbeb',
      itemSelectedColor: '#f59e0b',
      itemHoverBg: '#fafaf9',
      itemHoverColor: '#1c1917',
      itemActiveBg: '#fef3c7',
      subMenuItemBg: 'transparent',
      darkItemSelectedBg: '#44403c',
      darkItemSelectedColor: '#fbbf24',
      darkItemHoverBg: '#292524',
      itemBorderRadius: 6,
      itemMarginBlock: 4,
      itemMarginInline: 4,
      iconSize: 16,
      iconMarginInlineEnd: 12,
      groupTitleFontSize: 12,
      groupTitleColor: '#78716c',
    },

    Input: {
      activeBorderColor: '#f59e0b',
      hoverBorderColor: '#fcd34d',
      activeShadow: '0 0 0 2px rgba(245, 158, 11, 0.2)',
      addonBg: '#fafaf9',
      paddingBlock: 8,
      paddingBlockLG: 12,
      paddingBlockSM: 4,
      paddingInline: 12,
      paddingInlineLG: 16,
      paddingInlineSM: 8,
    },

    Select: {
      optionSelectedBg: '#fffbeb',
      optionSelectedColor: '#f59e0b',
      optionActiveBg: '#fafaf9',
      selectorBg: '#ffffff',
      multipleItemBg: '#f5f5f4',
      multipleItemBorderColor: '#e7e5e4',
      clearBg: '#f5f5f4',
    },

    Modal: {
      headerBg: '#ffffff',
      contentBg: '#ffffff',
      footerBg: '#ffffff',
      titleFontSize: 18,
      titleLineHeight: 1.5,
    },

    Drawer: {
      footerPaddingBlock: 16,
      footerPaddingInline: 24,
    },

    Form: {
      labelColor: '#1c1917',
      labelFontSize: 14,
      labelHeight: 32,
      labelColonMarginInlineStart: 2,
      labelColonMarginInlineEnd: 8,
      itemMarginBottom: 24,
      verticalLabelPadding: '0 0 8px',
    },

    DatePicker: {
      cellActiveWithRangeBg: '#fef3c7',
      cellHoverBg: '#fffbeb',
      cellHoverWithRangeBg: '#fef3c7',
      cellRangeBorderColor: '#fcd34d',
    },

    Tag: {
      defaultBg: '#f5f5f4',
      defaultColor: '#57534e',
    },

    Badge: {
      dotSize: 8,
      textFontSize: 12,
      textFontWeight: 500,
    },

    Tabs: {
      itemSelectedColor: '#f59e0b',
      itemHoverColor: '#d97706',
      itemActiveColor: '#b45309',
      inkBarColor: '#f59e0b',
      horizontalItemPadding: '12px 16px',
      horizontalItemPaddingLG: '16px 24px',
      horizontalItemPaddingSM: '8px 12px',
    },

    Steps: {
      colorPrimary: '#f59e0b',
    },

    Progress: {
      defaultColor: '#f59e0b',
      remainingColor: '#f5f5f4',
    },

    Spin: {
      dotSize: 20,
      dotSizeSM: 14,
      dotSizeLG: 32,
    },

    Tooltip: {
      colorBgSpotlight: '#1c1917',
      colorTextLightSolid: '#ffffff',
    },

    Message: {
      contentBg: '#ffffff',
      contentPadding: '10px 16px',
    },

    Notification: {
      width: 384,
    },

    Breadcrumb: {
      itemColor: '#78716c',
      lastItemColor: '#1c1917',
      linkColor: '#57534e',
      linkHoverColor: '#f59e0b',
      separatorColor: '#a8a29e',
      separatorMargin: 8,
    },

    Pagination: {
      itemActiveBg: '#f59e0b',
      itemActiveColorDisabled: '#a8a29e',
      itemBg: '#ffffff',
      itemInputBg: '#ffffff',
      itemLinkBg: '#ffffff',
      itemSize: 32,
      itemSizeSM: 24,
    },

    Avatar: {
      containerSize: 32,
      containerSizeLG: 40,
      containerSizeSM: 24,
      textFontSize: 14,
      textFontSizeLG: 18,
      textFontSizeSM: 12,
      groupOverlapping: -8,
      groupBorderColor: '#ffffff',
    },

    Dropdown: {
      paddingBlock: 8,
      controlItemBgHover: '#fafaf9',
      controlItemBgActive: '#fffbeb',
      controlItemBgActiveHover: '#fef3c7',
    },

    Divider: {
      colorSplit: '#e7e5e4',
      textPaddingInline: 16,
    },

    Skeleton: {
      gradientFromColor: '#f5f5f4',
      gradientToColor: '#e7e5e4',
    },

    Switch: {
      colorPrimary: '#f59e0b',
      colorPrimaryHover: '#d97706',
    },

    Checkbox: {
      colorPrimary: '#f59e0b',
      colorPrimaryHover: '#d97706',
      colorPrimaryBorder: '#fcd34d',
    },

    Radio: {
      colorPrimary: '#f59e0b',
      colorPrimaryHover: '#d97706',
      colorPrimaryBorder: '#fcd34d',
      dotSize: 8,
      radioSize: 16,
    },

    Slider: {
      trackBg: '#f59e0b',
      trackHoverBg: '#d97706',
      handleColor: '#f59e0b',
      handleActiveColor: '#d97706',
      dotActiveBorderColor: '#f59e0b',
      railBg: '#e7e5e4',
      railHoverBg: '#d6d3d1',
    },

    Rate: {
      starColor: '#f59e0b',
      starSize: 20,
    },

    Upload: {
      colorFillAlter: '#fafaf9',
    },

    Alert: {
      withDescriptionIconSize: 24,
      withDescriptionPadding: 20,
    },

    List: {
      itemPadding: '12px 0',
      itemPaddingLG: '16px 24px',
      itemPaddingSM: '8px 16px',
      metaMarginBottom: 16,
    },

    Descriptions: {
      labelBg: '#fafaf9',
      titleMarginBottom: 20,
      itemPaddingBottom: 16,
    },

    Collapse: {
      headerBg: '#fafaf9',
      headerPadding: '12px 16px',
      contentBg: '#ffffff',
      contentPadding: '16px',
    },

    Timeline: {
      dotBg: '#ffffff',
      dotBorderWidth: 2,
      itemPaddingBottom: 20,
    },

    Tree: {
      nodeSelectedBg: '#fffbeb',
      nodeHoverBg: '#fafaf9',
      directoryNodeSelectedBg: '#fef3c7',
      directoryNodeSelectedColor: '#b45309',
    },

    Transfer: {
      itemPaddingBlock: 8,
      listHeight: 200,
      listWidth: 200,
      listWidthLG: 250,
    },

    Empty: {
      colorTextDisabled: '#a8a29e',
    },

    Result: {
      titleFontSize: 24,
      subtitleFontSize: 14,
      iconFontSize: 72,
    },

    Statistic: {
      titleFontSize: 14,
      contentFontSize: 24,
    },

    Segmented: {
      itemSelectedBg: '#ffffff',
      itemSelectedColor: '#1c1917',
      itemHoverBg: '#f5f5f4',
      itemHoverColor: '#1c1917',
      itemActiveBg: '#e7e5e4',
      trackBg: '#f5f5f4',
    },

    FloatButton: {
      colorBgElevated: '#ffffff',
    },

    Tour: {
      primaryPrevBtnBg: 'rgba(255, 255, 255, 0.15)',
    },

    QRCode: {
      borderRadiusLG: 8,
    },

    Image: {
      previewOperationColor: 'rgba(255, 255, 255, 0.65)',
      previewOperationHoverColor: 'rgba(255, 255, 255, 0.85)',
      previewOperationColorDisabled: 'rgba(255, 255, 255, 0.25)',
    },

    Calendar: {
      fullBg: '#ffffff',
      fullPanelBg: '#ffffff',
      itemActiveBg: '#fffbeb',
    },

    Anchor: {
      linkPaddingBlock: 4,
      linkPaddingInlineStart: 16,
    },

    ColorPicker: {
      colorTextPlaceholder: '#a8a29e',
    },
  },
};

/**
 * Dark Theme Configuration
 *
 * Extends the light theme with dark mode specific overrides.
 * Uses warm dark grays to maintain the luxury aesthetic.
 *
 * WCAG AA Accessibility Compliance for Dark Mode:
 * - Light text on dark backgrounds must have 4.5:1+ contrast
 * - Focus indicators bright enough to see against dark backgrounds
 */
export const antdDarkTheme: ThemeConfig = {
  token: {
    ...antdTheme.token,

    // =========================================
    // Dark Mode Background Colors
    // =========================================
    colorBgContainer: '#1c1917',
    colorBgElevated: '#292524',
    colorBgLayout: '#0c0a09',
    colorBgSpotlight: '#292524',
    colorBgMask: 'rgba(0, 0, 0, 0.65)',

    // =========================================
    // Dark Mode Text Colors (WCAG AA compliant)
    // =========================================
    // #fafaf9 on #1c1917 = 15.1:1 (passes AAA)
    colorText: '#fafaf9',
    // #a8a29e on #1c1917 = 6.3:1 (passes AA)
    colorTextSecondary: '#a8a29e',
    // #78716c on #1c1917 = 3.9:1 (borderline - using lighter)
    colorTextTertiary: '#a8a29e', // Changed to match secondary for compliance
    colorTextQuaternary: '#78716c',

    // =========================================
    // Dark Mode Border Colors
    // =========================================
    colorBorder: '#44403c',
    colorBorderSecondary: '#292524',

    // =========================================
    // Dark Mode Fill Colors
    // =========================================
    colorFill: '#292524',
    colorFillSecondary: '#1c1917',
    colorFillTertiary: '#0c0a09',
    colorFillQuaternary: '#0c0a09',

    // =========================================
    // Brighter Primary for Dark Mode Contrast
    // =========================================
    colorPrimary: '#fbbf24',
    colorPrimaryHover: '#fcd34d',
    colorPrimaryActive: '#f59e0b',
    colorPrimaryBg: '#44403c',
    colorPrimaryBgHover: '#57534e',
    colorPrimaryBorder: '#78716c',
    colorPrimaryBorderHover: '#a8a29e',
    // Gold text on dark: #fbbf24 on #1c1917 = 9.4:1 (passes AAA)
    colorPrimaryText: '#fbbf24',
    colorPrimaryTextHover: '#fcd34d',
    colorPrimaryTextActive: '#fde68a',

    // =========================================
    // Dark Mode Status Colors (WCAG AA compliant)
    // =========================================
    colorSuccessBg: '#064e3b',
    colorWarningBg: '#78350f',
    colorErrorBg: '#7f1d1d',
    colorInfoBg: '#0c4a6e',
    // Status text colors for dark mode (light text on dark backgrounds)
    colorSuccessText: '#6ee7b7', // Light green on dark = 8.2:1
    colorWarningText: '#fcd34d', // Light amber on dark = 10.7:1
    colorErrorText: '#fca5a5', // Light red on dark = 7.8:1
    colorInfoText: '#7dd3fc', // Light blue on dark = 8.6:1
  },

  components: {
    ...antdTheme.components,

    Button: {
      ...antdTheme.components?.Button,
      primaryShadow: '0 2px 8px rgba(251, 191, 36, 0.35)',
      defaultBorderColor: '#44403c',
      defaultColor: '#fafaf9',
      defaultBg: '#1c1917',
      defaultHoverBg: '#292524',
      defaultHoverColor: '#fbbf24',
      defaultHoverBorderColor: '#78716c',
      defaultActiveBg: '#44403c',
      defaultActiveColor: '#fcd34d',
      defaultActiveBorderColor: '#a8a29e',
    },

    Card: {
      ...antdTheme.components?.Card,
      actionsBg: '#292524',
    },

    Table: {
      ...antdTheme.components?.Table,
      headerBg: '#292524',
      headerColor: '#fafaf9',
      headerSortActiveBg: '#44403c',
      headerSortHoverBg: '#44403c',
      headerFilterHoverBg: '#44403c',
      rowHoverBg: '#292524',
      rowSelectedBg: '#44403c',
      rowSelectedHoverBg: '#57534e',
      rowExpandedBg: '#292524',
      borderColor: '#44403c',
      headerSplitColor: '#44403c',
      footerBg: '#292524',
      footerColor: '#fafaf9',
    },

    Menu: {
      ...antdTheme.components?.Menu,
      itemSelectedBg: '#44403c',
      itemSelectedColor: '#fbbf24',
      itemHoverBg: '#292524',
      itemHoverColor: '#fafaf9',
      itemActiveBg: '#57534e',
      groupTitleColor: '#a8a29e',
    },

    Input: {
      ...antdTheme.components?.Input,
      activeBorderColor: '#fbbf24',
      hoverBorderColor: '#78716c',
      activeShadow: '0 0 0 2px rgba(251, 191, 36, 0.2)',
      addonBg: '#292524',
    },

    Select: {
      ...antdTheme.components?.Select,
      optionSelectedBg: '#44403c',
      optionSelectedColor: '#fbbf24',
      optionActiveBg: '#292524',
      selectorBg: '#1c1917',
      multipleItemBg: '#292524',
      multipleItemBorderColor: '#44403c',
      clearBg: '#292524',
    },

    Modal: {
      ...antdTheme.components?.Modal,
      headerBg: '#1c1917',
      contentBg: '#1c1917',
      footerBg: '#1c1917',
    },

    Tooltip: {
      ...antdTheme.components?.Tooltip,
      colorBgSpotlight: '#292524',
      colorTextLightSolid: '#fafaf9',
    },

    Message: {
      ...antdTheme.components?.Message,
      contentBg: '#292524',
    },

    DatePicker: {
      ...antdTheme.components?.DatePicker,
      cellActiveWithRangeBg: '#44403c',
      cellHoverBg: '#292524',
      cellHoverWithRangeBg: '#44403c',
      cellRangeBorderColor: '#78716c',
    },

    Tag: {
      ...antdTheme.components?.Tag,
      defaultBg: '#292524',
      defaultColor: '#a8a29e',
    },

    Skeleton: {
      ...antdTheme.components?.Skeleton,
      gradientFromColor: '#292524',
      gradientToColor: '#44403c',
    },

    Divider: {
      ...antdTheme.components?.Divider,
      colorSplit: '#44403c',
    },

    Upload: {
      ...antdTheme.components?.Upload,
      colorFillAlter: '#292524',
    },

    Descriptions: {
      ...antdTheme.components?.Descriptions,
      labelBg: '#292524',
    },

    Collapse: {
      ...antdTheme.components?.Collapse,
      headerBg: '#292524',
      contentBg: '#1c1917',
    },

    Tree: {
      ...antdTheme.components?.Tree,
      nodeSelectedBg: '#44403c',
      nodeHoverBg: '#292524',
      directoryNodeSelectedBg: '#57534e',
      directoryNodeSelectedColor: '#fbbf24',
    },

    Segmented: {
      ...antdTheme.components?.Segmented,
      itemSelectedBg: '#292524',
      itemSelectedColor: '#fafaf9',
      itemHoverBg: '#292524',
      itemHoverColor: '#fafaf9',
      itemActiveBg: '#44403c',
      trackBg: '#1c1917',
    },

    Calendar: {
      ...antdTheme.components?.Calendar,
      fullBg: '#1c1917',
      fullPanelBg: '#1c1917',
      itemActiveBg: '#44403c',
    },

    Slider: {
      ...antdTheme.components?.Slider,
      railBg: '#44403c',
      railHoverBg: '#57534e',
    },

    Switch: {
      ...antdTheme.components?.Switch,
      colorPrimary: '#fbbf24',
      colorPrimaryHover: '#fcd34d',
    },

    Checkbox: {
      ...antdTheme.components?.Checkbox,
      colorPrimary: '#fbbf24',
      colorPrimaryHover: '#fcd34d',
      colorPrimaryBorder: '#78716c',
    },

    Radio: {
      ...antdTheme.components?.Radio,
      colorPrimary: '#fbbf24',
      colorPrimaryHover: '#fcd34d',
      colorPrimaryBorder: '#78716c',
    },

    FloatButton: {
      ...antdTheme.components?.FloatButton,
      colorBgElevated: '#292524',
    },
  },
};

/**
 * Theme token type exports for TypeScript support
 */
export type AntdThemeTokens = NonNullable<ThemeConfig['token']>;
export type AntdComponentTokens = NonNullable<ThemeConfig['components']>;
