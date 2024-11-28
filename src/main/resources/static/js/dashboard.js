let roomData = [];
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
        const dashboardLink = document.getElementById('nav-dashboard');
        if (dashboardLink) {
          dashboardLink.classList.add('active');
        }
      }
    })
    .catch(error => console.error('Error loading sidebar:', error));
}

function checkAndUpdateRoomStatus() {
  // 현재 날짜 가져오기
  const today = new Date();
  today.setHours(0, 0, 0, 0);  // 시간을 00:00:00으로 설정

  // 모든 예약된 방에 대해 체크
  fetch('/api/reservations/active')  // 현재 이용중인 예약 목록 조회
    .then(response => response.json())
    .then(reservations => {
      reservations.forEach(reservation => {
        const checkoutDate = new Date(reservation.checkoutDt);
        const nextDay = new Date(checkoutDate);
        nextDay.setDate(checkoutDate.getDate() + 1);
        nextDay.setHours(0, 0, 0, 0);

        // 오늘이 체크아웃 다음날인 경우
        if (today.getTime() === nextDay.getTime()) {
          // 방 상태를 '점검중'으로 업데이트
          fetch('/api/room', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json; charset=utf-8'
            },
            body: JSON.stringify({
              roomNumber: reservation.roomNumber,
              status: 'maintenance'
            })
          })
            .then(response => response.json())
            .then(data => {
              if (data.success) {
                console.log(`Room ${reservation.roomNumber} status updated to maintenance`);
                // 필요한 경우 UI 업데이트
                updateRoomStatusUI(reservation.roomNumber, 'maintenance');
              }
            })
            .catch(error => console.error('Error updating room status:', error));
        }
      });
    })
    .catch(error => console.error('Error checking reservations:', error));
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
  console.log('Dashboard page loaded');
  loadSidebar();
  loadRoomData().then(rooms => {
    initializeFloorButtons(rooms);
    checkAndUpdateRoomStatus();
  })
    .catch(error => {
      console.error('Error initializing dashboard:', error);
    });
  loadMyReservations();
});

function loadRoomData() {
  return fetch('/api/room')
    .then(response => response.json())
    .then(rooms => {
      roomData = rooms;
      updateStats(rooms);
      displayHotelFloors(rooms);
      return rooms;
    })
    .catch(error => {
      console.error('Error:', error);
      alert('객실 데이터를 불러오는데 실패했습니다.');
      throw error;
    });
}

function updateStats(rooms) {
  document.getElementById('totalRooms').textContent = rooms.length;
  document.getElementById('availableRooms').textContent =
    rooms.filter(room => room.status === 'available').length;
  document.getElementById('occupiedRooms').textContent =
    rooms.filter(room => room.status === 'occupied').length;
  document.getElementById('maintenanceRooms').textContent =
    rooms.filter(room => room.status === 'maintenance').length;
}

function displayHotelFloors(rooms) {
  // 객실 번호로 정렬
  rooms.sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));

  // 층별로 객실 그룹화
  const floorGroups = {};
  rooms.forEach(room => {
    const floor = room.roomNumber.substring(0, 1);
    if (!floorGroups[floor]) {
      floorGroups[floor] = [];
    }
    floorGroups[floor].push(room);
  });

  // 호텔 컨테이너 초기화
  const container = document.getElementById('hotelContainer');
  container.innerHTML = '';

  // 층별로 표시 (위에서부터 아래로)
  Object.keys(floorGroups)
    .sort((a, b) => b - a)
    .forEach(floor => {
      const floorDiv = document.createElement('div');
      floorDiv.className = 'hotel-floor';

      floorDiv.innerHTML = `
        <div class="floor-title">${floor}층</div>
        <div class="row">
          ${floorGroups[floor].map(room => `
            <div class="col-md-2">
              <div class="room ${room.status}" onclick="showRoomDetails('${room.roomNumber}')">
                <div class="room-number">${room.roomNumber}</div>
                <div class="room-type">${room.roomType}</div>
                <div class="room-status">${getStatusText(room.status)}</div>
              </div>
            </div>
          `).join('')}
        </div>
      `;

      container.appendChild(floorDiv);
    });
}

function getStatusText(status) {
  switch (status) {
    case 'available': return '이용 가능';
    case 'occupied': return '사용 중';
    case 'reserved': return '예약됨';
    case 'maintenance': return '점검 중';
    default: return '상태 미정';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'available':
      return 'bg-success';
    case 'occupied':
      return 'bg-danger';
    case 'reserved':
      return 'bg-info';
    case 'maintenance':
      return 'bg-warning';
    default:
      return 'bg-secondary';
  }
}

function showRoomDetails(roomNumber) {
  // 상세정보 컨테이너 표시
  const container = document.getElementById('roomDetailContainer');
  const contentDiv = container.querySelector('.detail-content');

  // 로딩 표시
  contentDiv.innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>';
  container.style.display = 'flex';

  // 저장된 데이터에서 해당 객실 찾기
  const room = roomData.find(r => r.roomNumber === roomNumber);

  if (!room) {
    contentDiv.innerHTML = '<div class="alert alert-danger m-3">객실 정보를 찾을 수 없습니다.</div>';
    return;
  }

  // roomDetail.html 로드
  fetch(`/html/components/roomDetail.html`)
    .then(response => response.text())
    .then(html => {
      contentDiv.innerHTML = html;

      // 저장된 데이터로 상세 정보 채우기
      document.getElementById('roomImage').src = '/images/room1.png';
      document.getElementById('detailRoomNumber').textContent = room.roomNumber;
      document.getElementById('detailRoomType').textContent = room.roomType;

      const statusElement = document.getElementById('detailStatus');
      statusElement.textContent = getStatusText(room.status);

      // 예약하기 버튼에 이벤트 리스너 추가
      const reserveButton = contentDiv.querySelector('.btn-primary');
      if (reserveButton) {
        if (room.status === 'available') {
          reserveButton.style.display = 'inline-block';
          reserveButton.onclick = function () {
            const roomType = document.getElementById('detailRoomType').textContent;
            window.location.href = `/html/reservation.html?roomNumber=${encodeURIComponent(roomNumber)}&roomType=${encodeURIComponent(roomType)}`;
          };
        } else {
          reserveButton.style.display = 'none';
        }
      }
    })
    .catch(error => {
      console.error('Error:', error);
      contentDiv.innerHTML = '<div class="alert alert-danger m-3">데이터를 불러오는데 실패했습니다.</div>';
    });
}

// 상세정보 닫기 함수 (roomDetail.html의 closeDetail 함수 수정)
function closeDetail() {
  const container = document.getElementById('roomDetailContainer');
  container.style.display = 'none';
}

// 오버레이 클릭 시 닫기
document.getElementById('roomDetailContainer').addEventListener('click', function (e) {
  if (e.target === this) {
    closeDetail();
  }
});

// 페이지 로드 시 세션 체크
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

// 층별 버튼 생성 및 이벤트 처리
function initializeFloorButtons(rooms) {
  const floors = [...new Set(rooms.map(room => room.roomNumber.substring(0, 1)))].sort();
  const buttonContainer = document.getElementById('floorButtons');
  buttonContainer.innerHTML = ''; // 기존 버튼들 초기화

  // 전체 버튼 추가
  const allButton = document.createElement('button');
  allButton.type = 'button';
  allButton.className = 'btn btn-outline-primary active';
  allButton.textContent = '전체';
  allButton.dataset.floor = 'all';
  allButton.onclick = () => filterByFloor('all');
  buttonContainer.appendChild(allButton);

  floors.forEach(floor => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'btn btn-outline-primary';
    button.textContent = `${floor}층`;
    button.dataset.floor = floor;
    button.onclick = () => filterByFloor(floor);
    buttonContainer.appendChild(button);
  });
}

// 층별 필터링 함수
function filterByFloor(floor) {
  // 버튼 활성화 상태 변경
  const buttons = document.querySelectorAll('#floorButtons button');
  buttons.forEach(button => {
    button.classList.remove('active');
    if (button.dataset.floor === floor || (floor === 'all' && button.dataset.floor === 'all')) {
      button.classList.add('active');
    }
  });

  // 객실 필터링 및 표시
  const filteredRooms = floor === 'all' ?
    roomData :
    roomData.filter(room => room.roomNumber.startsWith(floor));

  displayHotelFloors(filteredRooms);
}