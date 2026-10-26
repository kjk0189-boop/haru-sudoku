# Bundled typefaces

These original, unmodified upstream webfont files are bundled locally so the web
app and Android package can render without a third-party font request.

## Pretendard 1.3.9

- Source: https://github.com/orioncactus/pretendard/tree/v1.3.9/packages/pretendard/dist/web/static/woff2-subset
- Copyright (c) 2021 Kil Hyung-jin, with Reserved Font Name Pretendard.
- License: SIL Open Font License 1.1, included as `Pretendard-LICENSE.txt`.
- Official Korean subset files: Regular (400), Medium (500), SemiBold (600), Bold (700).
- Use Pretendard for Korean UI labels, instructions and general text. Keep a
  system sans-serif fallback for characters outside the upstream subset.

## Manrope

- Source: https://github.com/googlefonts/manrope/tree/468c0dbe38efa331b80bfe9448256abe27be44c3/fonts/webfonts
- Upstream filename: `Manrope[wght].woff2`; saved as `Manrope-Variable.woff2`.
- Copyright 2018 The Manrope Project Authors.
- License: SIL Open Font License 1.1, included as `Manrope-OFL.txt`.
- Variable weight range: 200–800. Intended for the Sudoku digits, timer and
  numerical statistics; pair with Pretendard when Korean appears in the same element.

## Verification

Downloaded from the upstream GitHub repositories on 2026-10-26. Every font has
the WOFF2 signature and a declared file length matching its actual size. No font
outlines, names or glyph sets were modified locally. A browser render/load check
must accompany the UI integration; file validation alone does not prove rendering.

| File | Bytes | SHA-256 |
| --- | ---: | --- |
| Pretendard-Regular.subset.woff2 | 267096 | `01dd73155fdfab7ce9b25224523e85a96927e21aef97f21957d41f1bfa7e3878` |
| Pretendard-Medium.subset.woff2 | 268324 | `6f4e897a59138903ae64e814df059790cf0e0ff73b8595810145aee23204469f` |
| Pretendard-SemiBold.subset.woff2 | 268752 | `4247dc5e260b92640c2cbd0e75091154647b71e1d5884116655e2903468c54cc` |
| Pretendard-Bold.subset.woff2 | 270784 | `78eb71c33101ee7d4f8d1b777d193a12d00f8a296e712a8c417cf27abe946397` |
| Manrope-Variable.woff2 | 53892 | `30b83738add8c9edd9e3450b98036a9a8fb5668d0cbd4eb0ce5fe6761197f21f` |
