# 아이콘 출처와 라이선스

`scripts/build-icons.py`가 아래 출처에서 SVG를 가져와 currentColor 심볼로
정규화한다. 테마 폴더마다 출처가 다르므로 라이선스도 폴더 단위로 갈린다.

| 폴더 | 출처 | 라이선스 |
|---|---|---|
| `material/` | [material-design-icons](https://github.com/google/material-design-icons) (Google) | Apache-2.0 |
| `breeze/` | [Breeze Icons](https://invent.kde.org/frameworks/breeze-icons) (KDE) — `fuel`·`charge` 제외 | LGPL-3.0-or-later |
| `breeze/fuel.svg`, `breeze/charge.svg` | 직접 그림 (Breeze에 자동차 도메인 아이콘이 없다) | 차필과 동일 |
| `apple/` | [Lucide](https://github.com/lucide-icons/lucide) | ISC |

## Breeze — LGPL 고지

    The Breeze Icon Theme
    Copyright (C) 2014 Uri Herrera <uri_herrera@nitrux.in> and others

    This library is free software; you can redistribute it and/or modify it
    under the terms of the GNU Lesser General Public License as published by
    the Free Software Foundation; either version 3 of the License, or (at your
    option) any later version.

빌드 스크립트가 `<style>`·`class`·`id`를 걷어내고 칠을 루트로 올리는 개작을
하므로, `breeze/` 아래 생성물도 LGPL-3.0-or-later로 배포한다.
원본 전문: <https://invent.kde.org/frameworks/breeze-icons/-/blob/master/COPYING-ICONS>

## apple 폴더가 SF Symbols가 아닌 이유

애플의 SF Symbols 사용 조건은 *"solely for creating user interfaces to be used in
software products running on Apple's iOS, iPadOS, macOS, tvOS or watchOS
operating systems"*다. 차필의 현재 설치 경로는 웹이라(README의 공개 데모·
셀프호스팅) 안드로이드·리눅스·윈도우 브라우저에 그대로 나가므로 번들에 넣을 수 없다.
Lucide는 24×24 선 기반에 둥근 끝처리라 SF와 결이 가장 가깝고 ISC다.
