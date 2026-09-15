# PRD — Sistema de Gestão de Estoque (ESTOQUE.OPS)

## Problem Statement
Full-stack responsive web app (mobile-first) for real-time inventory control in a Brazilian retail store. Product CRUD with photos, BRL prices, colored stock badges, quick sale/entry buttons, WhatsApp notifications (via wa.me) to owner and suppliers.

## Users
- **Dono da Loja** (Store Owner): manages products, receives sale alerts and full reports on WhatsApp.
- **Balconista**: uses -1 Venda / +1 Entrada from the counter on mobile.

## User Choices
- WhatsApp: wa.me links (no API)
- Auth: JWT email/password + Emergent Google Auth
- Photos: base64 in MongoDB (client downscales to ~800px JPEG q=0.82)
- Store Config screen for owner's WhatsApp
- Theme: blue + black (Electric Blue on Obsidian)

## Architecture
- FastAPI + MongoDB (motor). Routes under `/api`. Auth: HS256 JWT in `access_token` httpOnly cookie + Bearer fallback.
- React (CRA + craco) + Tailwind + shadcn/ui. Router: BrowserRouter with a hash-based OAuth callback detector.
- Fonts: Outfit (headings) / Manrope (body) via Google Fonts.

## Implemented (2026-02-15)
- Backend
  - Auth: register / login / logout / me / google-session (Emergent OAuth exchange)
  - Store Config: GET/PUT `/api/config`
  - Products: full CRUD, stock adjust endpoint (delta ±N, floor at 0)
  - Per-user data isolation via `user_id`
  - Admin seed (admin@estoque.com / admin123), Mongo indexes on startup
- Frontend
  - Login, Register, AuthCallback (Emergent Google)
  - Dashboard: stats strip, full report WhatsApp button, product cards with photo, BRL price, stock badge (OK/BAIXO/ESGOTADO), -1/+1 buttons, supplier restock WhatsApp button when low/out, edit + delete with confirm
  - Product form: photo capture (camera/gallery) with client-side downscale
  - Store Config screen with WhatsApp number + store name
  - Bottom nav (Estoque / Novo / Config) + sticky glassmorphism TopBar

## Backlog (P1/P2)
- Atomic `$inc` for stock adjustments (avoid races) [P2]
- Migrate deprecated `@app.on_event` to FastAPI lifespan [P2]
- Sale history log / analytics [P1]
- Bulk import (CSV) [P2]
- Categories/tags for products [P2]
- Multi-store per owner [P2]
- Push web notifications alongside WhatsApp [P2]

## Testing
- Backend: 22/22 passing (iteration_1). See `/app/test_reports/iteration_1.json`.
- Credentials in `/app/memory/test_credentials.md`.
