let totalCustomers = [];
let currentPage = 1;
const itemsPerPage = 10;
let isUsernameAvailable = false;
let isEmailAvailable = false;
let originalCustomerData = null;

// 예약 확인 모달 닫기 함수 추가
function closeReservationModal() {
  if (currentModal) {
    document.body.focus();
    currentModal.hide();
    currentModal = null;
  }
}

// 예약 확인 모달 관리를 위한 전역 변수
let currentModal = null;

// 예약 확인 함수
async function checkReservation(customerId) {
  try {
    const response = await fetch(`/api/reservation/customer/${customerId}`);
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || '예약 정보를 불러올 수 없습니다.');
    }

    const reservations = await response.json();
    currentReservations = reservations;

    // 모달 요소 가져오기
    const modalElement = document.getElementById('reservationModal');

    // 테이블 내용 생성
    const tableContent = `
            <div class="table-responsive">
                <table class="table table-hover" id="reservationTable">
                    <thead>
                        <tr>
                            <th>객실 번호</th>
                            <th>객실 타입</th>
                            <th>체크인</th>
                            <th>체크아웃</th>
                            <th>예약일</th>>
                        </tr>
                    </thead>
                    <tbody>
                        ${reservations.length === 0 ? `
                            <tr>
                                <td colspan="6" class="text-center">
                                    <i class="fas fa-info-circle me-2"></i>예약 내역이 없습니다.
                                </td>
                            </tr>
                        ` : reservations.map(reservation => `
                            <tr>
                                <td>${reservation.roomNumber}호</td>
                                <td>${getRoomTypeText(reservation.roomType)}</td>
                                <td>${formatDate(reservation.checkinDt)}</td>
                                <td>${formatDate(reservation.checkoutDt)}</td>
                                <td>${formatDate(reservation.reservationDt)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

    modalElement.querySelector('.modal-body').innerHTML = tableContent;

    const modal = new bootstrap.Modal(modalElement);
    modal.show();

  } catch (error) {
    console.error('Error:', error);
    alert('예약 정보를 불러오는데 실패했습니다: ' + error.message);
  }
}
// 예약 수정 모달 열기
async function editReservationModal(reservationId) {
  try {
    console.log('Opening modal for reservation:', reservationId);

    // 현재 예약 목록에서 해당 예약 찾기
    const reservation = currentReservations.find(r => r.id === reservationId);

    if (!reservation) {
      console.error('Reservation not found:', reservationId);
      throw new Error('예약 정보를 찾을 수 없습니다.');
    }

    console.log('Found reservation:', reservation);

    // 모달 필드 설정
    document.getElementById('editReservationId').value = reservationId;
    document.getElementById('editCheckinDate').value = reservation.checkinDt.split(' ')[0];
    document.getElementById('editCheckoutDate').value = reservation.checkoutDt.split(' ')[0];

    // 기존 선택된 객실 번호 저장
    const currentRoomNumber = reservation.roomNumber;
    console.log('Current room number:', currentRoomNumber);

    // 날짜 입력 필드에 이벤트 리스너 추가
    const dateFields = ['editCheckinDate', 'editCheckoutDate'];
    dateFields.forEach(fieldId => {
      const element = document.getElementById(fieldId);
      element.removeEventListener('change', updateAvailableRooms);
      element.addEventListener('change', updateAvailableRooms);
    });

    // 사용 가능한 객실 목록 업데이트
    await updateAvailableRooms();

    // 현재 객실 선택
    const roomSelect = document.getElementById('editRoomSelect');
    if (roomSelect.querySelector(`option[value="${currentRoomNumber}"]`)) {
      roomSelect.value = currentRoomNumber;
    }

    // 모달 표시
    const modal = new bootstrap.Modal(document.getElementById('editReservationModal'));
    modal.show();

  } catch (error) {
    console.error('Error in editReservationModal:', error);
    alert('예약 수정 모달을 열 수 없습니다: ' + error.message);
  }
}

// 날짜 유효성 검사
function isValidDateFormat(dateString) {
  if (!dateString) return false;
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  return dateRegex.test(dateString);
}

// 수정 모달 열기 함수 분리
async function openEditModal(reservation) {
  try {
    // 날짜 형식 변환
    const checkinDate = formatDateForInput(reservation.checkinDt);
    const checkoutDate = formatDateForInput(reservation.checkoutDt);

    console.log('Checking availability for:', {
      checkinDate,
      checkoutDate,
      reservationId: reservation.id
    });

    // 객실 정보와 예약된 객실 정보 모두 가져오기
    const [roomResponse, occupiedResponse] = await Promise.all([
      fetch('/api/room'),
      fetch(`/api/room/occupied?checkinDate=${checkinDate}&checkoutDate=${checkoutDate}&excludeReservationId=${reservation.id}`)
    ]);

    if (!roomResponse.ok || !occupiedResponse.ok) {
      throw new Error('객실 정보를 불러올 수 없습니다.');
    }

    const [rooms, occupiedRooms] = await Promise.all([
      roomResponse.json(),
      occupiedResponse.json()
    ]);

    console.log('API responses:', {
      rooms,
      occupiedRooms
    });

    // 현재 수정 중인 예약의 객실은 선택 가능하도록 occupiedRooms에서 제외
    const occupiedRoomNumbers = occupiedRooms
      .filter(room => room.reservationId !== reservation.id)
      .map(room => room.roomNumber);

    // 객실 선택 옵션 생성
    const roomSelect = document.getElementById('editRoomSelect');
    roomSelect.innerHTML = '';

    rooms.forEach(room => {
      const option = document.createElement('option');
      option.value = room.roomNumber;
      option.textContent = `${room.roomNumber}호 (${getRoomTypeText(room.roomType)})`;

      const isCurrentRoom = room.roomNumber === reservation.roomNumber;
      const isOccupied = occupiedRoomNumbers.includes(room.roomNumber);

      if (isCurrentRoom || !isOccupied) {
        option.disabled = false;
        if (isCurrentRoom) {
          option.selected = true;
        }
      } else {
        option.disabled = true;
        option.textContent += ' (예약됨)';
      }

      roomSelect.appendChild(option);
    });

    // 수정 모달의 입력 필드 설정
    document.getElementById('editReservationId').value = reservation.id;
    document.getElementById('editCheckinDate').value = checkinDate;
    document.getElementById('editCheckoutDate').value = checkoutDate;

    // 수정 모달 열기
    const editModal = document.getElementById('editReservationModal');
    editModal.removeAttribute('aria-hidden');

    const modal = new bootstrap.Modal(editModal);
    modal.show();

  } catch (error) {
    console.error('Error:', error);
    alert('수정 모달을 열 수 없습니다: ' + error.message);
  }
}

// 날짜 변경 시 사용 가능한 객실 업데이트
async function updateAvailableRooms() {
  try {
    const checkinDate = document.getElementById('editCheckinDate').value;
    const checkoutDate = document.getElementById('editCheckoutDate').value;
    const reservationId = document.getElementById('editReservationId').value;

    if (!checkinDate || !checkoutDate) {
      console.log('날짜가 선택되지 않았습니다.');
      return;
    }

    console.log('Checking availability for:', {
      checkinDate,
      checkoutDate,
      reservationId
    });

    // 객실 정보와 예약된 객실 정보 가져오기
    const response = await fetch(
      `/api/room/occupied?` +
      `checkinDate=${encodeURIComponent(checkinDate)}` +
      `&checkoutDate=${encodeURIComponent(checkoutDate)}` +
      `&excludeReservationId=${encodeURIComponent(reservationId)}`
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Server response:', errorText);
      throw new Error('객실 정보를 불러올 수 없습니다.');
    }

    const data = await response.json();
    console.log('API response:', data);

    // 객실 선택 드롭다운 업데이트
    const roomSelect = document.getElementById('editRoomSelect');
    const currentValue = roomSelect.value;

    // 드롭다운 초기화
    roomSelect.innerHTML = '<option value="">객실을 선택해주세요</option>';

    // 객실 목록 생성
    data.rooms.forEach(room => {
      const option = document.createElement('option');
      option.value = room.roomNumber;
      option.textContent = `${room.roomNumber}호 (${getRoomTypeText(room.roomType)})`;

      // 예약된 객실인지 확인
      const isOccupied = data.occupiedRooms.some(
        occupiedRoom => occupiedRoom.roomNumber === room.roomNumber
      );

      if (isOccupied) {
        option.disabled = true;
        option.textContent += ' (예약됨)';
      }

      // 현재 선택된 객실이면 선택 상태 유지
      if (room.roomNumber === currentValue) {
        option.selected = true;
      }

      roomSelect.appendChild(option);
    });

  } catch (error) {
    console.error('Error in updateAvailableRooms:', error);
    throw error;
  }
}
// 예약 수정 함수
async function updateReservation() {
  try {
    const reservationId = document.getElementById('editReservationId').value;
    const roomNumber = document.getElementById('editRoomSelect').value;
    const checkinDate = document.getElementById('editCheckinDate').value;
    const checkoutDate = document.getElementById('editCheckoutDate').value;

    // 입력값 검증
    if (!roomNumber || !checkinDate || !checkoutDate) {
      alert('모든 필수 항목을 입력해주세요.');
      return;
    }

    // 날짜 유효성 검사
    if (new Date(checkinDate) >= new Date(checkoutDate)) {
      alert('체크아웃 날짜는 체크인 날짜보다 뒤여야 합니다.');
      return;
    }

    const response = await fetch(`/api/reservation/customer/${reservationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        roomNumber: roomNumber,
        checkinDt: checkinDate,
        checkoutDt: checkoutDate
      })
    });

    if (!response.ok) throw new Error('예약 수정에 실패했습니다.');

    const result = await response.json();
    if (result.success) {
      alert('예약이 수정되었습니다.');

      // 수정 모달 닫기
      const editModal = document.getElementById('editReservationModal');
      const modal = bootstrap.Modal.getInstance(editModal);

      // 포커스 처리 및 모달 닫기
      document.body.focus();
      modal.hide();

      // 예약 목록 새로고침
      setTimeout(() => {
        checkReservation(currentCustomerId);
      }, 100);
    }
  } catch (error) {
    console.error('Error:', error);
    alert(error.message);
  }
}
// 객실 타입 변환 함수
function getRoomTypeText(type) {
  const roomTypes = {
    'NORMAL': '일반',
    'SUITE': '스위트',
    'BUSINESS': '비즈니스',
    'VIP': 'VIP'
  };
  return roomTypes[type] || type;
}

// 날짜를 input type="date"에 맞는 형식으로 변환
// 날짜 형식 변환 함수들
function formatDateForInput(dateString) {
  try {
    if (!dateString) return '';

    // 날짜 문자열에서 시간 부분 제거
    const datePart = dateString.split(' ')[0];

    // YYYY-MM-DD 형식 확인
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (dateRegex.test(datePart)) {
      return datePart;
    }

    console.log('Original date string:', dateString);
    console.log('Parsed date part:', datePart);

    // 다른 형식일 경우 수동으로 파싱
    const parts = datePart.split('-');
    if (parts.length === 3) {
      const year = parts[0];
      const month = parts[1].padStart(2, '0');
      const day = parts[2].padStart(2, '0');
      return `${year}-${month}-${day}`;
    }

    throw new Error('Unsupported date format');
  } catch (error) {
    console.error('Error formatting date:', error, dateString);
    return '';
  }
}


// 예약 삭제 처리
async function deleteReservation(reservationId) {
  if (!confirm('정말로 이 예약을 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`/api/reservation/${reservationId}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete reservation');

    const data = await response.json();
    if (data.success) {
      alert('예약이 삭제되었습니다.');
      // 예약 목록 새로고침
      checkReservation(currentCustomerId);
    }
  } catch (error) {
    console.error('Error:', error);
    alert('예약 삭제에 실패했습니다.');
  }
}

// 날짜 입력용 포맷 함수
function formatDateForInput(dateString) {
  const date = new Date(dateString);
  return date.toISOString().split('T')[0];
}
// 날짜 포맷 함수
function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// 날짜시간 포맷 함수
function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '-';
  const date = new Date(dateTimeString);
  return date.toLocaleString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
// 사이드바 로드 함수 수정
function loadSidebar() {
  fetch('/html/components/sidebar.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('sidebarContainer').innerHTML = html;

      // 스크립트 실행
      const scriptContent = html.match(/<script id="sidebarScript">([\s\S]*?)<\/script>/);
      if (scriptContent && scriptContent[1]) {
        eval(scriptContent[1]);  // 스크립트 직접 실행

        // 현재 페이지 메뉴 활성화
        const customerLink = document.getElementById('nav-customer');
        if (customerLink) {
          customerLink.classList.add('active');
        }
      }
    })
    .catch(error => console.error('Error loading sidebar:', error));
}

// 페이지 초기화 부분 수정 (362-369번 라인)
document.addEventListener('DOMContentLoaded', function () {
  console.log('Customer Management page loaded');
  loadSidebar();
  loadCustomers();
  checkSession();

  // 고객 추가 버튼 클릭 이벤트 리스너 추가
  document.getElementById('addCustomerBtn').addEventListener('click', function () {
    // 모달 초기화
    document.getElementById('addUsername').value = '';
    document.getElementById('addPassword').value = '';
    document.getElementById('addName').value = '';
    document.getElementById('addEmail').value = '';
    document.getElementById('usernameCheck').innerHTML = '';
    document.getElementById('emailCheck').innerHTML = '';
    isUsernameAvailable = false;
    isEmailAvailable = false;

    // 모달 열기
    const modal = new bootstrap.Modal(document.getElementById('addModal'));
    // 체크인/체크아웃 날짜 변경 이벤트 리스너
    document.getElementById('editCheckinDate').addEventListener('change', updateAvailableRooms);
    document.getElementById('editCheckoutDate').addEventListener('change', updateAvailableRooms);
    modal.show();
  });
});

// 검색 이벤트 리스너 설정
const searchInput = document.getElementById('searchInput');
const searchType = document.getElementById('searchType');

let debounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    searchCustomers();
  }, 300);
});

searchType.addEventListener('change', () => {
  searchCustomers();
});

// 정렬 이벤트 리스너 설정
document.querySelectorAll('.sortable').forEach(header => {
  header.addEventListener('click', () => {
    sortCustomers(header.dataset.sort);
  });
});

// 실시간 아이디 중복 확인
async function checkUsernameReal(username) {
  const checkResult = document.getElementById('usernameCheck');

  if (!username) {
    checkResult.innerHTML = '아이디를 입력해주세요.';
    checkResult.className = 'form-text text-danger';
    isUsernameAvailable = false;
    return;
  }

  try {
    const response = await fetch(`/api/check-username?username=${encodeURIComponent(username)}`);
    const data = await response.json();

    if (data.available) {
      checkResult.innerHTML = '사용 가능한 아이디입니다.';
      checkResult.className = 'form-text text-success';
      isUsernameAvailable = true;
    } else {
      checkResult.innerHTML = '이미 사용중인 아이디입니다.';
      checkResult.className = 'form-text text-danger';
      isUsernameAvailable = false;
    }
  } catch (error) {
    console.error('Error:', error);
    checkResult.innerHTML = '중복 확인 중 오류가 발생했습니다.';
    checkResult.className = 'form-text text-danger';
    isUsernameAvailable = false;
  }
}

// 실시간 이메일 중복 확인
async function checkEmailReal(email) {
  const checkResult = document.getElementById('emailCheck');
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

  if (!email) {
    checkResult.innerHTML = '이메일을 입력해주세요.';
    checkResult.className = 'form-text text-danger';
    isEmailAvailable = false;
    return;
  }

  if (!emailRegex.test(email)) {
    checkResult.innerHTML = '올바른 이메일 형식이 아닙니다.';
    checkResult.className = 'form-text text-danger';
    isEmailAvailable = false;
    return;
  }

  try {
    const response = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`);
    const data = await response.json();

    if (data.available) {
      checkResult.innerHTML = '사용 가능한 이메일입니다.';
      checkResult.className = 'form-text text-success';
      isEmailAvailable = true;
    } else {
      checkResult.innerHTML = '이미 사용중인 이메일입니다.';
      checkResult.className = 'form-text text-danger';
      isEmailAvailable = false;
    }
  } catch (error) {
    console.error('Error:', error);
    checkResult.innerHTML = '중복 확인 중 오류가 발생했습니다.';
    checkResult.className = 'form-text text-danger';
    isEmailAvailable = false;
  }
}

// 고객 목록 로드
async function loadCustomers() {
  try {
    const response = await fetch('/api/customer');
    if (!response.ok) throw new Error('Failed to load customers');

    const data = await response.json();
    totalCustomers = Array.isArray(data) ? data : [];

    displayCustomers(currentPage);
    updatePagination();
  } catch (error) {
    console.error('Error:', error);
    alert('고객 목록을 불러오는데 실패했습니다.');
  }
}

// 고객 검색
async function searchCustomers() {
  const searchType = document.getElementById('searchType').value;
  const searchTerm = document.getElementById('searchInput').value.trim();

  try {
    let url = '/api/customer';
    if (searchTerm) {
      url += `?type=${searchType}&term=${encodeURIComponent(searchTerm)}`;
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error('Search failed');

    const data = await response.json();
    totalCustomers = Array.isArray(data) ? data : [];
    currentPage = 1;

    displayCustomers(currentPage);
    updatePagination();
  } catch (error) {
    console.error('Error:', error);
    alert('검색 중 오류가 발생했습니다.');
  }
}

// 고객 목록 표시
function displayCustomers(page) {
  const start = (page - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedCustomers = totalCustomers.slice(start, end);

  const tbody = document.getElementById('customerTableBody');
  tbody.innerHTML = '';

  paginatedCustomers.forEach(customer => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
          <td>${customer.id}</td>
          <td>${customer.username}</td>
          <td>${customer.name}</td>
          <td>${customer.email}</td>
          <td>
            <button class="btn btn-sm btn-info me-1" onclick="checkReservation(${customer.id})">
        예약 확인
            </button>
            <button class="btn btn-sm btn-primary me-1" onclick="editCustomer(${customer.id})">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger" onclick="deleteCustomer(${customer.id})">
              <i class="fas fa-trash"></i>
            </button>
          </td>
        `;
    tbody.appendChild(tr);
  });
}

// 페이지네이션 업데이트
function updatePagination() {
  const totalPages = Math.ceil(totalCustomers.length / itemsPerPage);
  const pagination = document.getElementById('pagination');
  pagination.innerHTML = '';

  // 처음으로 버튼
  const firstLi = document.createElement('li');
  firstLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  firstLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(1)">
          <i class="fas fa-angle-double-left"></i>
        </a>
      `;
  pagination.appendChild(firstLi);

  // 이전 페이지 버튼
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${currentPage - 1})">
          <i class="fas fa-angle-left"></i>
        </a>
      `;
  pagination.appendChild(prevLi);

  // 페이지 번호 (최대 7개)
  let startPage = Math.max(1, currentPage - 3);
  let endPage = Math.min(totalPages, startPage + 6);

  // 끝부분 처리
  if (endPage - startPage < 6) {
    startPage = Math.max(1, endPage - 6);
  }

  for (let i = startPage; i <= endPage; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${currentPage === i ? 'active' : ''}`;
    li.innerHTML = `
          <a class="page-link" href="#" onclick="changePage(${i})">${i}</a>
        `;
    pagination.appendChild(li);
  }

  // 다음 페이지 버튼
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  nextLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${currentPage + 1})">
          <i class="fas fa-angle-right"></i>
        </a>
      `;
  pagination.appendChild(nextLi);

  // 마지막으로 버튼
  const lastLi = document.createElement('li');
  lastLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
  lastLi.innerHTML = `
        <a class="page-link" href="#" onclick="changePage(${totalPages})">
          <i class="fas fa-angle-double-right"></i>
        </a>
      `;
  pagination.appendChild(lastLi);
}

// 페이지 변경
function changePage(page) {
  if (page < 1 || page > Math.ceil(totalCustomers.length / itemsPerPage)) return;
  currentPage = page;
  displayCustomers(currentPage);
  updatePagination();
}

// 고객 정렬
function sortCustomers(field) {
  const header = document.querySelector(`[data-sort="${field}"]`);
  const isAsc = !header.classList.contains('asc');

  // 모든 헤더의 정렬 클래스 제거
  document.querySelectorAll('.sortable').forEach(h => {
    h.classList.remove('asc', 'desc');
  });

  // 현재 헤더에 정렬 클래스 추가
  header.classList.add(isAsc ? 'asc' : 'desc');

  totalCustomers.sort((a, b) => {
    const aVal = a[field];
    const bVal = b[field];

    if (typeof aVal === 'string') {
      return isAsc ?
        aVal.localeCompare(bVal) :
        bVal.localeCompare(aVal);
    }
    return isAsc ? aVal - bVal : bVal - aVal;
  });

  displayCustomers(currentPage);
}

// 추가 모달 초기화
function cancelAdd() {
  document.getElementById('addUsername').value = '';
  document.getElementById('addPassword').value = '';
  document.getElementById('addName').value = '';
  document.getElementById('addEmail').value = '';
  document.getElementById('usernameCheck').innerHTML = '';
  document.getElementById('emailCheck').innerHTML = '';
  isUsernameAvailable = false;
  isEmailAvailable = false;
  const modal = bootstrap.Modal.getInstance(document.getElementById('addModal'));
  if (modal) modal.hide();
}

// 고객 추가
async function addCustomer() {
  const username = document.getElementById('addUsername').value.trim();
  const password = document.getElementById('addPassword').value.trim();
  const name = document.getElementById('addName').value.trim();
  const email = document.getElementById('addEmail').value.trim();

  if (!username || !password || !name || !email) {
    alert('모든 필수 항목을 입력해주세요.');
    return;
  }

  if (!isUsernameAvailable || !isEmailAvailable) {
    alert('아이디와 이메일 중복 확인이 필요합니다.');
    return;
  }

  try {
    const response = await fetch('/api/customer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        password,
        name,
        email
      })
    });

    if (!response.ok) throw new Error('Failed to add customer');

    const data = await response.json();
    if (data.success) {
      alert('고객이 추가되었습니다.');
      cancelAdd();
      loadCustomers();
    } else {
      alert('고객 추가에 실패했습니다.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('고객 추가 중 오류가 발생했습니다.');
  }
}

// 고객 수정 모달 열기
function editCustomer(id) {
  const customer = totalCustomers.find(c => c.id === id);
  if (customer) {
    originalCustomerData = { ...customer };
    document.getElementById('editId').value = customer.id;
    document.getElementById('editUsername').value = customer.username;
    document.getElementById('editName').value = customer.name;
    document.getElementById('editEmail').value = customer.email;
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
  }
}

// 수정 시 이메일 실시간 검증
async function checkEditEmailReal(email) {
  const checkResult = document.getElementById('editEmailCheck');
  const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;

  if (!email) {
    checkResult.innerHTML = '이메일을 입력해주세요.';
    checkResult.className = 'form-text text-danger';
    return false;
  }

  if (!emailRegex.test(email)) {
    checkResult.innerHTML = '올바른 이메일 형식이 아닙니다.';
    checkResult.className = 'form-text text-danger';
    return false;
  }

  // 원래 이메일과 같으면 중복 체크 스킵
  if (email === originalCustomerData.email) {
    checkResult.innerHTML = '사용 가능한 이메일입니다.';
    checkResult.className = 'form-text text-success';
    return true;
  }

  try {
    const response = await fetch(`/api/check-email?email=${encodeURIComponent(email)}`);
    const data = await response.json();

    if (data.available) {
      checkResult.innerHTML = '사용 가능한 이메일입니다.';
      checkResult.className = 'form-text text-success';
      return true;
    } else {
      checkResult.innerHTML = '이미 사용중인 이메일입니다.';
      checkResult.className = 'form-text text-danger';
      return false;
    }
  } catch (error) {
    console.error('Error:', error);
    checkResult.innerHTML = '중복 확인 중 오류가 발생했습니다.';
    checkResult.className = 'form-text text-danger';
    return false;
  }
}

// updateCustomer 함수 수정
async function updateCustomer() {
  const id = document.getElementById('editId').value;
  const name = document.getElementById('editName').value.trim();
  const email = document.getElementById('editEmail').value.trim();

  if (!name || !email) {
    alert('모든 필수 항목을 입력해주세요.');
    return;
  }

  // 이메일 유효성 검사
  if (!await checkEditEmailReal(email)) {
    alert('올바른 이메일을 입력해주세요.');
    return;
  }

  try {
    const response = await fetch(`/api/customer/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        name,
        email
      })
    });

    if (!response.ok) throw new Error('Failed to update customer');

    const data = await response.json();
    if (data.success) {
      alert('고객 정보가 수정되었습니다.');
      const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
      modal.hide();
      loadCustomers();
    } else {
      alert('고객 정보 수정에 실패했습니다.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('고객 정보 수정 중 오류가 발생했습니다.');
  }
}

// 고객 삭제
async function deleteCustomer(id) {
  if (!confirm('정말로 이 고객을 삭제하시겠습니까?')) return;

  try {
    const response = await fetch(`/api/customer/${id}`, {
      method: 'DELETE'
    });

    if (!response.ok) throw new Error('Failed to delete customer');

    const data = await response.json();
    if (data.success) {
      alert('고객이 삭제되었습니다.');
      loadCustomers();
    } else {
      alert('고객 삭제에 실패했습니다.');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('고객 삭제 중 오류가 발생했습니다.');
  }
}

// 세션 체크
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