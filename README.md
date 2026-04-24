# 학급 교우 관계 분석기 (React + Vite)

클라우드 동기화는 **Supabase(Postgres)** 를 기본으로 씁니다. ([SUPABASE.md](SUPABASE.md))  
`VITE_DATA_BACKEND=supabase`(기본 권장)이면 Firebase env가 있어도 **DB는 Supabase만** 사용합니다. Firestore는 [FIRESTORE.md](FIRESTORE.md) 참고.

---

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
