# 학급 교우 관계 분석기 (React + Vite)

**GitHub Pages** 배포는 `VITE_DATA_BACKEND=auto` 로 빌드됩니다. **Firebase·Supabase 시크릿을 모두 넣으면 Firestore에 먼저** 저장됩니다. ([FIRESTORE.md](FIRESTORE.md))  
로컬에서 **Supabase만** 쓰려면 `.env.local`에 `VITE_DATA_BACKEND=supabase` ([SUPABASE.md](SUPABASE.md)).

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
