import { defineConfig } from "vite";
import viteTsconfigPaths from "vite-tsconfig-paths";
import svgrPlugin from "vite-plugin-svgr";

// https://vitejs.dev/config/
export default defineConfig({
    // https://github.com/vitejs/vite/issues/1973
    define: {
        "process.env": process.env,
        // // By default, Vite doesn't include shims for NodeJS/
        // // necessary for segment analytics lib to work
        "global": {},
    },
    resolve: {
        alias: {
            process: "process/browser.js",
            buffer: "buffer",
            crypto: "crypto-browserify",
            stream: "stream-browserify",
            assert: "assert",
            http: "stream-http",
            https: "https-browserify",
            os: "os-browserify",
            url: "url",
            util: "util",
        },
    },
    plugins: [ viteTsconfigPaths(), svgrPlugin()],
    optimizeDeps: { // 👈 optimizedeps
      esbuildOptions: {
        target: "esnext", 
        // Node.js global to browser globalThis
        define: {
          global: 'globalThis'
        },
        supported: { 
          bigint: true 
        },
      }
    }, 

    build: {
      target: ["esnext"], // 👈 build.target
    },
});