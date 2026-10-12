import React, { useState, useMemo } from 'react';

/**
 * ====================================================================
 * REUSABLE DATATABLE COMPONENT
 * ====================================================================
 * Features:
 * - Search filter across all visible data columns
 * - Page length control (10, 25, 50, 100 entries)
 * - Clickable column sorting with up/down indicator carets
 * - Dynamic pagination controls ("Showing X to Y of Z entries")
 * - Sleek horizontal scrolling for wide financial tables
 * - Styled 1:1 with PHP admin's dark theme
 */
const DataTable = ({
  columns = [],
  data = [],
  keyField = 'id',
  defaultSortField = '',
  defaultSortAsc = true,
  defaultPageSize = 10,
  pageSizeOptions = [10, 25, 50, 100],
  searchPlaceholder = 'Search records...',
  tableClassName = 'table table-dark-custom table-hover align-middle mb-0',
  minWidth = '100%',
  showSearch = true,
  showPageSize = true,
  showPagination = true,
  actions = null,
  emptyMessage = 'No matching records found',
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState(defaultSortField || (columns[0]?.key || ''));
  const [sortAsc, setSortAsc] = useState(defaultSortAsc);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  // 1. SEARCH FILTERING
  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const lower = searchTerm.toLowerCase();

    return data.filter((item) => {
      return columns.some((col) => {
        let val = '';
        if (typeof col.searchValue === 'function') {
          val = col.searchValue(item);
        } else if (col.key && item[col.key] !== undefined && item[col.key] !== null) {
          val = item[col.key];
        }
        return String(val).toLowerCase().includes(lower);
      });
    });
  }, [data, columns, searchTerm]);

  // 2. COLUMN SORTING
  const sortedData = useMemo(() => {
    if (!sortField) return filteredData;

    return [...filteredData].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      // Custom sort accessor if defined
      const col = columns.find((c) => c.key === sortField);
      if (col && typeof col.sortValue === 'function') {
        aVal = col.sortValue(a);
        bVal = col.sortValue(b);
      }

      if (aVal === bVal) return 0;
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // Numerical sort
      const aNum = Number(aVal);
      const bNum = Number(bVal);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortAsc ? aNum - bNum : bNum - aNum;
      }

      // String sort
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (aStr < bStr) return sortAsc ? -1 : 1;
      if (aStr > bStr) return sortAsc ? 1 : -1;
      return 0;
    });
  }, [filteredData, sortField, sortAsc, columns]);

  // Reset to page 1 if filtered dataset shrinks
  const totalRecords = sortedData.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // 3. PAGINATION SLICE
  const paginatedData = useMemo(() => {
    const startIdx = (currentPage - 1) * pageSize;
    return sortedData.slice(startIdx, startIdx + pageSize);
  }, [sortedData, currentPage, pageSize]);

  const handleSort = (key, sortable = true) => {
    if (!sortable) return;
    if (sortField === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(key);
      setSortAsc(true);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  // Pagination page numbers generator
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  const startRecord = totalRecords === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  return (
    <div className="datatable-container w-100">
      {/* Top Controls: Page Size & Search Input */}
      {(showPageSize || showSearch || actions) && (
        <div className="datatable-header d-flex flex-wrap justify-content-between align-items-center gap-3 px-4 py-3 border-bottom" style={{ borderColor: 'var(--border-color)' }}>
          <div className="d-flex align-items-center gap-2">
            {showPageSize && (
              <div className="d-flex align-items-center gap-2 text-theme-secondary small">
                <span>Show</span>
                <select
                  className="form-select form-select-sm form-select-custom py-1"
                  style={{ width: '75px', borderRadius: '8px' }}
                  value={pageSize}
                  onChange={handlePageSizeChange}
                >
                  {pageSizeOptions.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <span>entries</span>
              </div>
            )}
            {actions}
          </div>

          {showSearch && (
            <div className="datatable-search" style={{ width: '280px' }}>
              <div className="input-group input-group-sm">
                <span className="input-group-text border-secondary text-info">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control search-input-custom"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={handleSearchChange}
                />
                {searchTerm && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => {
                      setSearchTerm('');
                      setCurrentPage(1);
                    }}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Main Table Scroll Container */}
      <div className="table-responsive custom-table-scroll">
        <table className={tableClassName} style={{ minWidth: minWidth, width: '100%' }}>
          <thead>
            <tr>
              {columns.map((col) => {
                const isSortable = col.sortable !== false;
                const isCurrentSort = sortField === col.key;

                return (
                  <th
                    key={col.key || col.label}
                    className={`${col.headerClassName || ''} ${isSortable ? 'user-select-none' : ''}`}
                    style={{
                      cursor: isSortable ? 'pointer' : 'default',
                      ...col.style,
                    }}
                    onClick={() => isSortable && handleSort(col.key)}
                  >
                    <div className="d-inline-flex align-items-center gap-1.5">
                      <span>{col.label}</span>
                      {isSortable && (
                        <span className="sort-icon small" style={{ fontSize: '10px' }}>
                          {isCurrentSort ? (
                            sortAsc ? (
                              <i className="bi bi-caret-up-fill text-info"></i>
                            ) : (
                              <i className="bi bi-caret-down-fill text-info"></i>
                            )
                          ) : (
                            <i className="bi bi-arrow-down-up text-white opacity-50"></i>
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {paginatedData.length > 0 ? (
              paginatedData.map((row, idx) => (
                <tr key={row[keyField] !== undefined ? row[keyField] : idx}>
                  {columns.map((col) => (
                    <td
                      key={col.key || col.label}
                      className={col.className || ''}
                      style={col.cellStyle}
                    >
                      {col.render
                        ? col.render(row, (currentPage - 1) * pageSize + idx)
                        : (row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '-')}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="text-center py-5 text-theme-secondary">
                  <div className="d-flex flex-column align-items-center justify-content-center py-3">
                    <i className="bi bi-inbox fs-1 text-theme-secondary opacity-50 mb-2"></i>
                    <span className="fw-semibold text-theme-secondary">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Bottom Pagination & Record Count Bar */}
      {showPagination && totalRecords > 0 && (
        <div
          className="datatable-footer d-flex flex-wrap justify-content-between align-items-center px-4 py-3 border-top gap-3"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="text-theme-secondary small fw-medium">
            Showing <span className="text-info fw-bold">{startRecord}</span> to{' '}
            <span className="text-info fw-bold">{endRecord}</span> of{' '}
            <span className="text-theme-primary fw-bold">{totalRecords}</span> entries
          </div>

          <div className="pagination-wrapper">
            <ul className="pagination pagination-sm mb-0 gap-1">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button
                  className="page-link bg-dark text-theme-primary border-secondary rounded"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-left"></i> Previous
                </button>
              </li>

              {getPageNumbers().map((num) => (
                <li
                  key={num}
                  className={`page-item ${currentPage === num ? 'active' : ''}`}
                >
                  <button
                    className={`page-link rounded ${
                      currentPage === num
                        ? 'bg-primary text-white border-primary fw-bold'
                        : 'bg-dark text-theme-primary border-secondary'
                    }`}
                    onClick={() => handlePageChange(num)}
                  >
                    {num}
                  </button>
                </li>
              ))}

              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button
                  className="page-link bg-dark text-theme-primary border-secondary rounded"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Next <i className="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
