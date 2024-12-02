let roomData = [];
function loadSidebar() {
  fetch('/html/components/sidebar.html')
    .then(response => response.text())
    .then(html => {
      document.getElementById('sidebarContainer').innerHTML = html;

      // 스크립트 실행
      const scriptContent = html.match(/<script id="sidebarScript">([\s\S]*?)<\/script>/);
      if (scriptContent && scriptContent[1]) {
        eval(scriptContent[1]);

        // 현재 페이지 메뉴 활성화
        const dashboardLink = document.getElementById('nav-dashboard');
        if (dashboardLink) {
          dashboardLink.classList.add('active');
        }
      }
    })
    .catch(error => console.error('Error loading sidebar:', error));
}

// 페이지 초기화
document.addEventListener('DOMContentLoaded', function () {
  // 현재 날짜 표시
  const now = new Date();
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  };
  document.getElementById('currentDate').textContent = now.toLocaleDateString('ko-KR', options);

  console.log('Dashboard page loaded');
  loadSidebar();
  loadRoomData().then(rooms => {
    initializeFloorButtons(rooms);
  })
    .catch(error => {
      console.error('Error initializing dashboard:', error);
    });

});

function loadRoomData() {
  return fetch('/api/room')
    .then(response => response.json())
    .then(rooms => {
      roomData = rooms;
      updateStats(rooms);
      
      // 2층 객실만 필터링하여 표시
      const secondFloorRooms = rooms.filter(room => room.roomNumber.startsWith('2'));
      displayHotelFloors(secondFloorRooms);

      // 2층 버튼 활성화
      const buttons = document.querySelectorAll('#floorButtons button');
      buttons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.floor === '2') {
          button.classList.add('active');
        }
      });

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
              <div class="room available" onclick="showRoomDetails('${room.roomNumber}')">
                <div class="room-number">${room.roomNumber}</div>
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
    case 'maintenance': return '점검 중';
    default: return '상태 미정';
  }
}

function getStatusBadgeClass(status) {
  switch (status) {
    case 'available':
      return 'bg-success';
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

      document.getElementById('roomImage').src = '/images/room1.png';
      document.getElementById('detailRoomNumber').textContent = room.roomNumber;
      document.getElementById('detailRoomType').textContent = room.roomType;

      const statusElement = document.getElementById('detailStatus');
      statusElement.textContent = getStatusText(room.status);

      // 예약하기 버튼에 이벤트 리스너 추가
      const reserveButton = contentDiv.querySelector('.btn-primary');
      if (reserveButton) {
        reserveButton.style.display = 'inline-block';
        reserveButton.onclick = function () {
          const roomType = document.getElementById('detailRoomType').textContent;
          window.location.href = `/html/reservation.html?roomNumber=${encodeURIComponent(roomNumber)}&roomType=${encodeURIComponent(roomType)}`;
        };
      }
    })
    .catch(error => {
      console.error('Error:', error);
      contentDiv.innerHTML = '<div class="alert alert-danger m-3">데이터를 불러오는데 실패했습니다.</div>';
    });
}

// 상세정보 닫기 함수 (roomDetail.html의 closeDetail 함수 수정)
function closeDetail() {
  const container = document.getElementById('roomDetailContainer')
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
  buttonContainer.innerHTML = '';

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

// 객실별 색상을 저장할 객체
const roomColors = {};
const usedColors = [];

// 사용되지 않은 색상 중에서 랜덤하게 선택하는 함수
function getUnusedRandomColor() {
  // 모든 색상이 사용된 경우 초기화
  if (usedColors.length >= eventColors.length) {
    usedColors.length = 0;
  }

  // 사용되지 않은 색상들 필터링
  const availableColors = eventColors.filter(color => !usedColors.includes(color));

  // 사용되지 않은 색상 중 랜덤 선택
  const randomIndex = Math.floor(Math.random() * availableColors.length);
  const selectedColor = availableColors[randomIndex];

  // 선택된 색상을 사용된 색상 배열에 추가
  usedColors.push(selectedColor);

  return selectedColor;
}

// 달력 초기화
document.addEventListener('DOMContentLoaded', function () {
  const calendarEl = document.getElementById('calendar');
  if (!calendarEl) {
    console.error('Calendar element not found');
    return;
  }

  const calendar = new FullCalendar.Calendar(calendarEl, {
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,dayGridWeek'
    },
    locale: 'ko',
    height: 'auto',
    contentHeight: 600,
    navLinks: false,
    fixedWeekCount: false,
    dayCellContent: function (arg) {
      return arg.dayNumberText.replace('일', '');
    },
    dayCellDidMount: function (arg) {
      if (arg.isToday) {
        arg.el.style.backgroundColor = 'rgba(255, 100, 100, .15)';
      }
    },
    eventDidMount: function (arg) {
      arg.el.style.borderRadius = '10px';
    },
    events: function (info, successCallback, failureCallback) {
      fetch('/api/reservation/all')
        .then(response => response.json())
        .then(data => {
          const events = data.map(reservation => {
            if (!roomColors[reservation.roomNumber]) {
              roomColors[reservation.roomNumber] = getUnusedRandomColor();
            }

            const checkoutDate = new Date(reservation.checkoutDt);
            checkoutDate.setDate(checkoutDate.getDate() + 1);

            return {
              title: `${reservation.roomNumber}호 - ${reservation.name}`,
              start: reservation.checkinDt,
              end: checkoutDate.toISOString().split('T')[0],
              backgroundColor: roomColors[reservation.roomNumber],
              borderColor: roomColors[reservation.roomNumber],
              extendedProps: {
                roomNumber: reservation.roomNumber,
                roomType: reservation.roomType
              }
            };
          });
          successCallback(events);
        })
        .catch(error => {
          console.error('Error fetching reservations:', error);
          failureCallback(error);
        });
    }
  });
  calendar.render();
  console.log('Calendar initialized');
});

// 예약 상세 정보 표시
function showReservationDetails(event) {
  const props = event.extendedProps;
  const content = `
        <div class="reservation-details">
            <h4>예약 상세 정보</h4>
            <p>객실 번호: ${props.roomNumber}</p>
            <p>객실 타입: ${props.roomType}</p>
            <p>체크인: ${event.start.toLocaleDateString()}</p>
            <p>체크아웃: ${event.end.toLocaleDateString()}</p>
            <p>상태: ${getStatusText(props.status)}</p>
        </div>
    `;

  // 상세 정보 모달 표시
  const detailContainer = document.getElementById('roomDetailContainer');
  detailContainer.querySelector('.detail-content').innerHTML = content;
  detailContainer.style.display = 'block';
}

// 새 예약 폼 표시
function showNewReservationForm(date) {
  window.location.href = `/html/reservation.html?date=${date.toISOString().split('T')[0]}`;
}

const eventColors = [
  '#FF8080',
  '#80B380',
  '#8080FF',
  '#FFB380',
  '#B380B3',
  '#80B3B3',
  '#FF80FF',
  '#FFB380',
  '#80B380',
  '#FF80B3',
  '#8080B3',
  '#FF9980',
  '#80B3B3',
  '#B39980',
  '#8099E6',
  '#E69980',
  '#80B3B3',
  '#B380FF',
  '#E68080',
  '#80B399',
  '#B3B380',
  '#E6B380'
];
