/** @type {import('tailwindcss').Config} */
// TailwindCSS 配置：Lofo 校园寻物 — 暖色编辑风设计系统
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          DEFAULT: '#1C1917',
          soft: '#292524',
          muted: '#57534E',
          faint: '#A8A29E',
        },
        cream: {
          DEFAULT: '#FAF7F2',
          deep: '#F5F0E8',
        },
        coral: {
          DEFAULT: '#E05A39',
          dark: '#C94A2C',
          soft: '#FDF0EC',
        },
        moss: {
          DEFAULT: '#3D7A5A',
          soft: '#ECF5F0',
        },
        amber: {
          soft: '#FFF8E8',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          warm: '#FFFCF7',
        },
        line: {
          DEFAULT: '#E7E0D4',
          soft: '#F0EAE0',
        },
      },
      fontFamily: {
        display: ['Newsreader', 'Noto Serif SC', 'Songti SC', 'SimSun', 'Georgia', 'serif'],
        sans: ['"PingFang SC"', '"Microsoft YaHei"', '"Noto Sans SC"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(28, 25, 23, 0.04), 0 8px 24px rgba(28, 25, 23, 0.06)',
        lift: '0 2px 4px rgba(28, 25, 23, 0.04), 0 16px 40px rgba(28, 25, 23, 0.12)',
        card: '0 1px 0 rgba(28,25,23,0.03), 0 10px 30px -12px rgba(28,25,23,0.12)',
      },
      transitionTimingFunction: {
        soft: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}
