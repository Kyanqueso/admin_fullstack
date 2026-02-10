import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({

  base: './', 

  build: {
    // Clear the dist folder before every build 
    outDir: 'dist',
    emptyOutDir: true,

    // Multi-Page App (MPA) Configuration
    rollupOptions: {
      input: {
        // You MUST list every single HTML file here. 
        login: resolve(__dirname, 'src/views/auth/index.html'),
        analytics: resolve(__dirname, 'src/views/analytics/analytics.html'),
        companies: resolve(__dirname, 'src/views/companies/companies.html'), 
        web_content: resolve(__dirname, 'src/views/web_content/web_content.html'),
        clients: resolve(__dirname, 'src/views/companies/clients/clients.html'),
        complete_orders: resolve(__dirname, 'src/views/companies/complete_orders/complete_orders.html'),
        orders: resolve(__dirname, 'src/views/companies/orders/orders.html'),
        payments: resolve(__dirname, 'src/views/companies/payments/payments.html'),
      },
    },
  },
});