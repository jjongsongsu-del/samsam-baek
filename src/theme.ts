export const colors = {
  gray0: '#ffffff',
  gray5: '#f8f8fa',
  gray10: '#f0f0f4',
  gray20: '#d8dbe2',
  gray40: '#8a949e',
  gray60: '#59636e',
  gray70: '#3f4852',
  gray90: '#1f242b',
  gray100: '#111418',
  primary5: '#eef5ff',
  primary10: '#d8e9ff',
  primary50: '#256ef4',
  primary60: '#1d56c5',
  primary70: '#173f91',
  secondary5: '#f2f5f8',
  secondary10: '#dfe7ef',
  secondary60: '#516272',
  success5: '#edf8f1',
  success60: '#007a45',
  warning5: '#fff8e6',
  warning60: '#986900',
  danger5: '#fff0f0',
  danger60: '#d50136',
  white: '#ffffff',

  ink: '#111418',
  forest: '#ffffff',
  forest2: '#eef5ff',
  leaf: '#256ef4',
  mint: '#256ef4',
  lime: '#007a45',
  cream: '#111418',
  paper: '#f8f8fa',
  amber: '#986900',
  root: '#d50136',
  line: '#d8dbe2',
  muted: '#59636e',
};

export const spacing = {
  screen: 16,
  card: 16,
  gap: 16,
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
};

export const radius = {
  xs: 2,
  sm: 4,
  md: 6,
  lg: 10,
  xl: 12,
};

export const typography = {
  display: { fontSize: 32, lineHeight: 40, fontWeight: '700' as const },
  heading: { fontSize: 24, lineHeight: 36, fontWeight: '700' as const },
  title: { fontSize: 19, lineHeight: 29, fontWeight: '700' as const },
  body: { fontSize: 15, lineHeight: 23, fontWeight: '400' as const },
  label: { fontSize: 15, lineHeight: 23, fontWeight: '700' as const },
  caption: { fontSize: 13, lineHeight: 20, fontWeight: '400' as const },
};

export const elevation = {
  level1: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};
