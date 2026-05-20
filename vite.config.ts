import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/tests/**/*.test.ts'],
    coverage: {
      exclude: [
        'src/main.tsx',
        'src/**/*.d.ts',
      ],
      include: [
        'src/core/**/*.{ts,tsx}',
        'src/ui/pages/actionLogView.ts',
        'src/ui/pages/battleHudSelectors.ts',
        'src/ui/pages/firstRunGuidance.ts',
      ],
      reporter: ['text', 'html', 'lcov'],
      reportsDirectory: 'coverage',
    },
  },
})
