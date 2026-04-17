// This Vite config file (vite.config.js) tells Rollup (production bundler)
// to treat multiple HTML files as entry points so each becomes its own built page.

import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        login: resolve(__dirname, "login.html"),
        main: resolve(__dirname, "main.html"),
        post: resolve(__dirname, "post.html"),
        createPost: resolve(__dirname, "postPopup.html"),
        myPosts: resolve(__dirname, "MyPosts.html"),
        allPosts: resolve(__dirname, "allPosts.html"),
        //postDetails: resolve(__dirname, "postDetails.html"),
        restaurants: resolve(__dirname, "allRestaurants.html"),
      },
    },
  },
});
