# cubes
Simulator for rubik cube (3x3, 2x2) and Pyramorphix

See it [running here](https://rsinkwitz.github.io/cubes/3x3/).

# Electron App
To run as Electron App, compile and run with
```bash
npm install
npm run build
npm start
```
# Web App
After `npm install` and `npm run build` copy the files from the `dist` directory to your web server. Also use `src/index.html`, but remove `../dist/` from the urls.