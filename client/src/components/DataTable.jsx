import { useState } from 'react'
import Pagination from './Pagination'

const PAGE_SIZE = 4

export default function DataTable({ columns = [], rows = [], page, totalPages, onPageChange, emptyText = 'Chưa có dữ liệu' }) {
  const [internalPage, setInternalPage] = useState(0)
  const isControlled = Number.isInteger(page) && Number.isInteger(totalPages)
  const localTotalPages = Math.max(Math.ceil(rows.length / PAGE_SIZE), 1)
  const currentPage = isControlled ? page : Math.min(internalPage, localTotalPages - 1)
  const currentTotalPages = isControlled ? totalPages : localTotalPages
  const visibleRows = isControlled
    ? rows
    : rows.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)

  const changePage = (nextPage) => {
    if (isControlled) onPageChange?.(nextPage)
    else setInternalPage(nextPage)
  }

  return (
    <div className="overflow-hidden rounded-xl glass shadow-glass animate-fade-in">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-dark-700/50 text-sm">
          <thead>
            <tr className="bg-dark-800/60">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-dark-400"
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-dark-800/40">
            {visibleRows.length ? (
              visibleRows.map((row, index) => (
                <tr
                  key={row.id || index}
                  className="group transition-colors duration-150 hover:bg-dark-800/40"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="px-4 py-3.5 text-dark-300 group-hover:text-dark-100 transition-colors"
                    >
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  className="px-4 py-12 text-center text-dark-500"
                  colSpan={columns.length}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className="h-12 w-12 rounded-full bg-dark-800/60 flex items-center justify-center">
                      <svg className="h-6 w-6 text-dark-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                      </svg>
                    </div>
                    <span>{emptyText}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={currentPage} totalPages={currentTotalPages} onChange={changePage} />
    </div>
  )
}
