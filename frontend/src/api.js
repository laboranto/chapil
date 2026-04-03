// API 호출을 담당하는 모듈.
// 모든 fetch 요청을 이 파일에 모아두면, 나중에 URL이나 인증 방식이 바뀌어도
// 이 파일만 수정하면 된다.

// 내부 헬퍼: fetch를 감싸서 공통 처리(헤더, 에러, JSON 파싱)를 수행한다.
async function req(method, path, body) {
  const res = await fetch(path, {
    method,
    // body가 있을 때만 Content-Type 헤더를 붙인다.
    headers: body ? { 'Content-Type': 'application/json' } : {},
    // body가 있을 때만 JSON 문자열로 직렬화해서 전송한다.
    body: body ? JSON.stringify(body) : undefined,
  })
  // 204 No Content: DELETE 성공 시 반환값 없음
  if (res.status === 204) return null
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

// 외부에서 사용하는 API 함수 모음
export const api = {
  // 대시보드
  getDashboard: () => req('GET', '/api/dashboard'),

  // 주유
  getFuel:        ()        => req('GET',    '/api/fuel'),
  createFuel:     (data)    => req('POST',   '/api/fuel', data),
  updateFuel:     (id, data)=> req('PUT',    `/api/fuel/${id}`, data),
  deleteFuel:     (id)      => req('DELETE', `/api/fuel/${id}`),

  // 정비
  getMaintenance:      ()        => req('GET',    '/api/maintenance'),
  getMaintenanceItems: ()        => req('GET',    '/api/maintenance/items'),
  createMaintenance:   (data)    => req('POST',   '/api/maintenance', data),
  updateMaintenance:   (id, data)=> req('PUT',    `/api/maintenance/${id}`, data),
  deleteMaintenance:   (id)      => req('DELETE', `/api/maintenance/${id}`),

  // 기타
  getOther:      ()        => req('GET',    '/api/other'),
  getOtherItems: ()        => req('GET',    '/api/other/items'),
  createOther:   (data)    => req('POST',   '/api/other', data),
  updateOther:   (id, data)=> req('PUT',    `/api/other/${id}`, data),
  deleteOther:   (id)      => req('DELETE', `/api/other/${id}`),

  // 설정
  getSettings:    ()     => req('GET', '/api/settings'),
  updateSettings: (data) => req('PUT', '/api/settings', data),
}
