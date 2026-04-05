import { memo, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { spacing } from '../../../theme/spacing';
import { radius } from '../../../theme/radius';
import { useThemePalette } from '../../../theme/useThemePalette';

type Props = {
  uri: string | null;
  title?: string;
};

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function QuranAudioBarInner({ uri, title }: Props) {
  const { colors: c, scheme } = useThemePalette();

  const html = useMemo(() => {
    if (!uri) return '';
    const safeTitle = title ? escapeHtml(title) : '';
    const safeUri = escapeHtml(uri);
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <style>
    body { margin:0; padding:10px 12px; background:${c.surface}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    .t { font-size:12px; color:${c.primary}; font-weight:700; margin-bottom:8px; }
    audio { width:100%; height:40px; }
  </style>
</head>
<body>
  ${safeTitle ? `<div class="t">${safeTitle}</div>` : ''}
  <audio controls preload="metadata" src="${safeUri}"></audio>
</body>
</html>`;
  }, [c.primary, c.surface, scheme, uri, title]);

  const borderTop = scheme === 'dark' ? 'rgba(142,207,178,0.15)' : 'rgba(0,53,39,0.12)';

  if (!uri) return null;

  const localFile = uri.startsWith('file:');

  return (
    <View style={[styles.wrap, { borderTopColor: borderTop, backgroundColor: c.surface }]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        style={styles.web}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        setSupportMultipleWindows={false}
        allowFileAccess={localFile}
        allowUniversalAccessFromFileURLs={Platform.OS === 'android' && localFile}
      />
    </View>
  );
}

export const QuranAudioBar = memo(QuranAudioBarInner);

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    overflow: 'hidden',
    paddingBottom: spacing.xxs,
  },
  web: {
    height: 96,
    width: '100%',
    backgroundColor: 'transparent',
  },
});
