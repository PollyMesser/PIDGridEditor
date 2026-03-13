# PID Grid Editor

A visual editor for placing TcHmi P&ID controls on a 19×10 grid and generating TcHmi HTML attribute code.

Built with React 19 + Vite 7.

**Live app:** https://pollymesser.github.io/PIDGridEditor/

## Features

- Drag controls from the toolbar onto a 19×10 grid
- Controls can span multiple cells (e.g. tanks, filterpresses)
- Select a placed control to change its variant and extra properties
- Generates ready-to-use `<div data-tchmi-*>` attribute blocks for TcHmi
- Layout is saved automatically in `localStorage`

## Dev setup

```bash
npm install
npm run dev      # start dev server at http://localhost:5173
npm run build    # production build → dist/
npm run preview  # preview the production build locally
npm run lint     # run ESLint
```

## Deploy to GitHub Pages

```bash
npm run deploy
```

Builds the app and pushes `dist/` to the `gh-pages` branch.

## Author

Claudia Spannbauer
