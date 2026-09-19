import { describe, it, expect, afterEach } from 'vitest'
import { sheetState } from './sheet'

const loc = { pathname: '/', key: 'abc' }

// node 환경이라 HTMLDialogElement가 원래 없다 — 미지원 브라우저와 같은 상태다.
afterEach(() => { delete globalThis.HTMLDialogElement })

describe('sheetState', () => {
  it('showModal이 있으면 배경 위치를 싣는다', () => {
    globalThis.HTMLDialogElement = class { showModal() {} }
    expect(sheetState(loc)).toEqual({ background: loc })
  })

  it('showModal이 없으면 undefined — 라우트가 전체 페이지로 떨어진다', () => {
    expect(sheetState(loc)).toBeUndefined()
  })

  it('dialog 엘리먼트는 있는데 showModal만 없는 경우도 걸러낸다', () => {
    globalThis.HTMLDialogElement = class {}
    expect(sheetState(loc)).toBeUndefined()
  })
})
