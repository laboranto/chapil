import { Fragment, useCallback } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { sheetState } from '../../sheet'
import { api } from '../../api'
import { usePaginatedList } from '../../hooks/usePaginatedList'
import RecordCard from './RecordCard'

const EDIT_PATH = {
  fuel: (id) => `/records/fuel/${id}/edit`,
  maintenance: (id) => `/records/maintenance/${id}/edit`,
  other: (id) => `/records/other/${id}/edit`,
}

const monthOf = (date) => date.slice(0, 7)

export default function RecordsList({ filter }) {
  const navigate = useNavigate()
  const location = useLocation()
  const fetchPage = useCallback(
    ({ cursor }) => api.getRecordsPage({ cursor, filter }),
    [filter]
  )
  const { records, hasMore, sentinelRef } = usePaginatedList(fetchPage)

  if (records.length === 0 && !hasMore)
    return <div className="empty">기록이 없어요</div>

  return (
    <>
      {records.map((r, i) => (
        <Fragment key={`${r.src}-${r.id}`}>
          {/* 세 질의 경로가 모두 date DESC로 고정이라(pagination.js) 앞 행과
              달이 다를 때만 헤더를 낸다 — 따로 그룹 배열을 만들 필요가 없다. */}
          {monthOf(r.date) !== (records[i - 1] && monthOf(records[i - 1].date)) && (
            <div className="month-header">
              {r.date.slice(0, 4)}년 {Number(r.date.slice(5, 7))}월
            </div>
          )}
          <RecordCard record={r} onOpen={() => navigate(EDIT_PATH[r.src](r.id), { state: sheetState(location) })} />
        </Fragment>
      ))}
      {hasMore && <div ref={sentinelRef} style={{ height: 1 }} />}
    </>
  )
}
