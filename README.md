# 학급 교우 관계 분석기 (React + Vite)

**GitHub Pages** 배포(`.github/workflows/deploy-gh-pages.yml`)는 **`VITE_DATA_BACKEND=supabase`**와 Repository **Secrets**의 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`로 빌드합니다. **Firestore를 쓰는 다른 배포**는 [FIRESTORE.md](FIRESTORE.md)를 참고하세요.  
로컬은 `.env.local`에 동일한 `VITE_DATA_BACKEND=supabase`와 Supabase 키를 맞추면 노트북과 웹·DB가 갈리지 않습니다. ([SUPABASE.md](SUPABASE.md))

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
