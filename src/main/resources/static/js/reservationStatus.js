document.addEventListener('DOMContentLoaded', function () {
    loadSidebar();
    loadReservations();
    initializeEventListeners();
});

function loadSidebar() {
    fetch('/html/components/sidebar.html')
        .then(response => response.text())
        .then(html => {
            document.getElementById('sidebarContainer').innerHTML = html;
            const scriptContent = html.match(/<script id="sidebarScript">([\s\S]*?)<\/script>/);
            if (scriptContent && scriptContent[1]) {
                eval(scriptContent[1]);

                // 현재 페이지 메뉴 활성화
                const reservationStatusLink = document.getElementById('nav-reservation-status');
                if (reservationStatusLink) {
                    reservationStatusLink.classList.add('active');
                }
            }
        })
        .catch(error => console.error('Error loading sidebar:', error));
}

function loadReservations() {
    fetch('/api/reservations')
        .then(response => response.json())
        .then(reservations => {
            updateStats(reservations);
            displayReservations(reservations);
        })
        .catch(error => console.error('Error:', error));
}

function updateStats(reservations) {
    const now = new Date();

    const total = reservations.length;
    const active = reservations.filter(r => {
        const checkIn = new Date(r.checkInDt);
        const checkOut = new Date(r.checkOutDt);
        return checkIn <= now && checkOut >= now;
    }).length;

    const upcoming = reservations.filter(r => {
        const checkIn = new Date(r.checkInDt);
        return checkIn > now;
    }).length;

    const past = reservations.filter(r => {
        const checkOut = new Date(r.checkOutDt);
        return checkOut < now;
    }).length;

    document.getElementById('totalReservations').textContent = total;
    document.getElementById('activeReservations').textContent = active;
    document.getElementById('upcomingReservations').textContent = upcoming;
    document.getElementById('pastReservations').textContent = past;
}

let currentPage = 1;
const entriesPerPage = 10; // 고정값으로 설정
let totalReservations = [];

// 전역 변수 추가
let currentSortColumn = '';
let currentSortOrder = 'asc';

function displayReservations(reservations) {
    totalReservations = reservations;
    if (currentSortColumn) {
        sortAndDisplayReservations();
    } else {
        displayPaginatedReservations();
    }
}

function displayPaginatedReservations(reservations = totalReservations) {
    const tbody = document.getElementById('reservationTableBody');
    tbody.innerHTML = '';

    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = startIndex + entriesPerPage;
    const paginatedReservations = reservations.slice(startIndex, endIndex);

    paginatedReservations.forEach(reservation => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${reservation.name}</td>
            <td>${reservation.roomNumber}</td>
            <td>${reservation.roomType}</td>
            <td>${formatDate(reservation.checkInDt)}</td>
            <td>${formatDate(reservation.checkOutDt)}</td>
        `;
        tbody.appendChild(tr);
    });

    updatePagination();
}

function updatePagination() {
    const totalPages = Math.ceil(totalReservations.length / entriesPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';

    // 처음 페이지로 버튼
    const firstLi = document.createElement('li');
    firstLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    firstLi.innerHTML = `<a class="page-link" href="#"><i class="fas fa-angle-double-left"></i></a>`;
    firstLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage !== 1) {
            currentPage = 1;
            displayPaginatedReservations();
        }
    };
    pagination.appendChild(firstLi);

    // 이전 페이지 버튼
    const prevLi = document.createElement('li');
    prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
    prevLi.innerHTML = `<a class="page-link" href="#"><i class="fas fa-angle-left"></i></a>`;
    prevLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            displayPaginatedReservations();
        }
    };
    pagination.appendChild(prevLi);

    // 페이지 번호 버튼
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${currentPage === i ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.onclick = (e) => {
            e.preventDefault();
            currentPage = i;
            displayPaginatedReservations();
        };
        pagination.appendChild(li);
    }

    // 다음 페이지 버튼
    const nextLi = document.createElement('li');
    nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    nextLi.innerHTML = `<a class="page-link" href="#"><i class="fas fa-angle-right"></i></a>`;
    nextLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            displayPaginatedReservations();
        }
    };
    pagination.appendChild(nextLi);

    // 마지막 페이지로 버튼
    const lastLi = document.createElement('li');
    lastLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
    lastLi.innerHTML = `<a class="page-link" href="#"><i class="fas fa-angle-double-right"></i></a>`;
    lastLi.onclick = (e) => {
        e.preventDefault();
        if (currentPage !== totalPages) {
            currentPage = totalPages;
            displayPaginatedReservations();
        }
    };
    pagination.appendChild(lastLi);
}

function getReservationStatus(reservation) {
    const now = new Date();
    const checkIn = new Date(reservation.checkInDt);
    const checkOut = new Date(reservation.checkOutDt);

    if (checkIn <= now && checkOut >= now) {
        return 'Active';
    } else if (checkIn > now) {
        return 'Upcoming';
    } else {
        return 'Past';
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function initializeEventListeners() {
    // stats-card 클릭 이벤트 리스너
    const statsCards = document.querySelectorAll('.stats-card');
    statsCards.forEach(card => {
        card.addEventListener('click', () => {
            // 활성화된 카드 스타일 변경
            statsCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');

            // 상태에 따른 필터링
            const status = card.dataset.status;
            filterReservations(status);
        });
    });

    // 첫 로드시 전체 예약 카드를 활성화
    document.querySelector('.stats-card[data-status="all"]').classList.add('active');

    // 정렬 이벤트 리스너
    const sortableHeaders = document.querySelectorAll('.sortable');
    sortableHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const column = header.dataset.sort;
            handleSort(column);
        });
    });
}

function filterReservations(status) {
    fetch('/api/reservations')
        .then(response => response.json())
        .then(reservations => {
            let filtered = reservations;
            if (status !== 'all') {
                filtered = reservations.filter(r =>
                    getReservationStatus(r).toLowerCase() === status);
            }
            displayReservations(filtered);
        })
        .catch(error => console.error('Error:', error));
}

function viewReservationDetails(reservationId) {
    // 예약 상세 정보 보기 구현
    // 모달 또는 새 페이지로 이동
    console.log('View reservation:', reservationId);
}

// 세션 체크 함수
function checkSession() {
    fetch('/api/check-session')
        .then(response => {
            if (!response.ok) {
                window.location.href = '/login';
            }
        })
        .catch(() => {
            window.location.href = '/login';
        });
}

// 페이지 로드 및 포커스 시 세션 체크
document.addEventListener('DOMContentLoaded', checkSession);
window.addEventListener('focus', checkSession);

// 뒤로가기 감지 및 세션 체크
window.addEventListener('pageshow', function (event) {
    if (event.persisted) {
        checkSession();
    }
});

function handleSort(column) {
    // 정렬 상태 업데이트
    if (currentSortColumn === column) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
    } else {
        currentSortColumn = column;
        currentSortOrder = 'asc';
    }

    // 정렬 아이콘 업데이트
    updateSortIcons(column);

    // 데이터 정렬 및 표시
    sortAndDisplayReservations();
}

function updateSortIcons(column) {
    const headers = document.querySelectorAll('.sortable');
    headers.forEach(header => {
        const icon = header.querySelector('i');
        if (header.dataset.sort === column) {
            icon.className = currentSortOrder === 'asc' ? 'fas fa-sort-up' : 'fas fa-sort-down';
            header.classList.add(currentSortOrder);
            header.classList.remove(currentSortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            icon.className = 'fas fa-sort';
            header.classList.remove('asc', 'desc');
        }
    });
}

function sortAndDisplayReservations() {
    const sortedReservations = [...totalReservations].sort((a, b) => {
        let valueA = a[currentSortColumn];
        let valueB = b[currentSortColumn];

        // 날짜 형식 처리
        if (currentSortColumn === 'checkInDt' || currentSortColumn === 'checkOutDt') {
            valueA = new Date(valueA);
            valueB = new Date(valueB);
        }
        // 숫자 형식 처리 (객실 번호)
        else if (currentSortColumn === 'roomNumber') {
            valueA = parseInt(valueA);
            valueB = parseInt(valueB);
        }
        // 문자열 처리
        else {
            valueA = String(valueA).toLowerCase();
            valueB = String(valueB).toLowerCase();
        }

        if (valueA < valueB) return currentSortOrder === 'asc' ? -1 : 1;
        if (valueA > valueB) return currentSortOrder === 'asc' ? 1 : -1;
        return 0;
    });

    currentPage = 1; // 정렬 후 첫 페이지로 이동
    displayPaginatedReservations(sortedReservations);
}
