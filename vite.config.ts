
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    base: '/school-diary-app/',
    plugins: [react(), tailwindcss()],
    define: {
        __firebase_config: JSON.stringify(JSON.stringify({
            apiKey: "dummy-api-key",
            authDomain: "dummy-auth-domain",
            projectId: "dummy-project-id",
            storageBucket: "dummy-storage-bucket",
            messagingSenderId: "dummy-sender-id",
            appId: "dummy-app-id"
        })),
        __app_id: JSON.stringify("school-diary-app"),
        __initial_auth_token: "undefined"
    }
})
