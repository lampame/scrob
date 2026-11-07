// @ts-check
import { defineConfig } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  output: 'server',

  // Astro 7 defaults to JSX whitespace rules, which drop the spaces around inline
  // elements split across lines; `true` keeps the lossless behavior of Astro 6.
  compressHTML: true,

  security: {
    checkOrigin: false,
  },

  server: {
    port: 7330,
  },

  vite: {
    plugins: [tailwindcss()],
    server: {
      allowedHosts: ['abstract-dev.bellamylab.com', 'scrob-dev.bellamylab.com'],
    }
  },

  adapter: node({
    mode: 'standalone'
  })
});