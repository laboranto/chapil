import { useSyncExternalStore } from 'react'

// 기록이 바뀔 때마다 번호를 올린다. 홈은 이 번호를 보고 목록·요약을 다시 읽는다.
//
// 양식이 전체 페이지였을 땐 저장하고 홈으로 돌아오면 홈이 새로 마운트되면서
// 공짜로 갱신됐다. 시트로 띄우면서 배경의 홈이 안 죽게 되어 그 공짜가 사라졌다.
//
// 올리는 자리는 api.js의 쓰기 함수들이다 — 컴포넌트가 아니라. 쓰기가 전부
// 거기로 모이니 가져오기(importConfirm)처럼 양식 밖에서 일어나는 변경도 같이
// 잡히고, 취소는 api를 안 부르니 저절로 갱신되지 않는다.
let revision = 0
const listeners = new Set()

export function bumpRecords() {
  revision += 1
  listeners.forEach(fn => fn())
}

const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn) }

export const useRecordsRevision = () =>
  useSyncExternalStore(subscribe, () => revision, () => revision)
