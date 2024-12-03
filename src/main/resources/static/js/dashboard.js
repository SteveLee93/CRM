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
  checkSession();
  console.log('Dashboard page loaded');

  // 현재 날짜 표시
  const now = new Date();
  const options = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  };

  document.getElementById('currentDate').textContent = now.toLocaleDateString('ko-KR', options);

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
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div class="floor-title">${floor}층</div>
          <div class="d-flex gap-2">
            <div class="btn btn-outline-success" onclick="showReservationModal()" 
                 style="margin: 0;
                        padding: 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        background-color: white;
                        border-color: #28a745;
                        color: #28a745;
                        transition: all 0.2s;">
              <div class="room-number" style="color: inherit;">예약하기</div>
            </div>
            <div class="btn btn-outline-primary" onclick="showAllReservations()" 
                 style="margin: 0;
                        padding: 10px;
                        border-radius: 4px;
                        cursor: pointer;
                        background-color: white;
                        border-color: #007bff;
                        color: #007bff;
                        transition: all 0.2s;">
              <div class="room-number" style="color: inherit;">전체 예약 보기</div>
            </div>
          </div>
        </div>
        <div class="row">
          ${floorGroups[floor].map(room => `
              <div class="room available" onclick="showRoomReservations('${room.roomNumber}')">
              <div class="room-number">${room.roomNumber}</div>
              <div class="room-type">${room.roomType}</div>
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

function showRoomDetails(roomType) {
  console.log(`Showing room details for ${roomType} type`);

  const container = document.getElementById('roomDetailContainer');
  const contentDiv = container.querySelector('.detail-content');

  if (!container || !contentDiv) {
    console.error('Modal container or content div not found');
    return;
  }

  contentDiv.innerHTML = `
        <div class="room-details-container">
            <h3 class="room-type-title text-center mt-3 mb-4">${roomType} Room</h3>
            <div id="roomImageCarousel" class="carousel slide" data-bs-ride="carousel">
                <div class="carousel-indicators">
                    <button type="button" data-bs-target="#roomImageCarousel" data-bs-slide-to="0" class="active" aria-current="true"></button>
                    <button type="button" data-bs-target="#roomImageCarousel" data-bs-slide-to="1"></button>
                    <button type="button" data-bs-target="#roomImageCarousel" data-bs-slide-to="2"></button>
                    <button type="button" data-bs-target="#roomImageCarousel" data-bs-slide-to="3"></button>
                </div>

                <div class="carousel-inner">
                    <div class="carousel-item active">
                    <img src="" class="d-block mx-auto" style="width: 500px; height: 300px;" id="roomImage1" alt="${roomType} Room Image 1">
                    </div>
                    <div class="carousel-item">
                        <img src="" class="d-block mx-auto" style="width: 500px; height: 300px;" id="roomImage2" alt="${roomType} Room Image 2">
                    </div>
                    <div class="carousel-item">
                        <img src="" class="d-block mx-auto" style="width: 500px; height: 300px;" id="roomImage3" alt="${roomType} Room Image 3">
                    </div>
                    <div class="carousel-item">
                        <img src="" class="d-block mx-auto" style="width: 500px; height: 300px;" id="roomImage4" alt="${roomType} Room Image 4">
                    </div>
                </div>

                <button class="carousel-control-prev" type="button" data-bs-target="#roomImageCarousel" data-bs-slide="prev">
                    <span class="carousel-control-prev-icon bg-dark rounded-circle" aria-hidden="true"></span>
                    <span class="visually-hidden">Previous</span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#roomImageCarousel" data-bs-slide="next">
                    <span class="carousel-control-next-icon bg-dark rounded-circle" aria-hidden="true"></span>
                    <span class="visually-hidden">Next</span>
                </button>
            </div>

            <div class="button-group text-center mt-3 mb-3">
                <button type="button" class="btn btn-secondary" id="exitButton">닫기</button>
            </div>
        </div>
    `;

  // 모달 표시
  container.style.display = 'flex';
  console.log('Modal displayed');

  // 모달 바깥 클릭 시 닫기
  container.onclick = function (event) {
    if (event.target === container) {
      container.style.display = 'none';
    }
  };

  // 이미지 로드
  for (let i = 1; i <= 4; i++) {
    const img = document.getElementById(`roomImage${i}`);
    if (img) {
      const imagePath = `/static/images/${roomType.toLowerCase()}/${roomType.toLowerCase()}${i}.PNG`;
      console.log(`Loading image ${i}: ${imagePath}`);

      img.onload = function () {
        console.log(`Image ${i} loaded successfully`);
      };

      img.onerror = function () {
        console.error(`Failed to load image ${i}: ${imagePath}`);
        this.style.display = 'none';
        this.closest('.carousel-item').style.display = 'none';
        this.onerror = null;
      };

      img.src = imagePath;
    } else {
      console.error(`Image element ${i} not found`);
    }
  }

  try {
    const carouselElement = document.getElementById('roomImageCarousel');
    if (carouselElement) {
      const carousel = new bootstrap.Carousel(carouselElement, {
        interval: 5000,
        wrap: true,
        keyboard: true,
        pause: 'hover'
      });
      console.log('Carousel initialized successfully');
    } else {
      console.error('Carousel element not found');
    }
  } catch (error) {
    console.error('Error initializing carousel:', error);
  }

  const exitButton = document.getElementById('exitButton');
  if (exitButton) {
    exitButton.onclick = () => {
      console.log('Closing modal by button click');
      container.style.display = 'none';
    };
  } else {
    console.error('Exit button not found');
  }
}

// 페이지 로드 시 세션 체크
function checkSession() {
  fetch('/api/check-session')
    .then(response => {
      console.log('Session check response:', response);
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

const roomColors = {};
const usedColors = [];

// 사용되지 않은 색상 중에서 랜덤하게 선택하는 함수
function getUnusedRandomColor() {
  if (usedColors.length >= eventColors.length) {
    usedColors.length = 0;
  }

  // 사용되지 않은 색상들 필터링
  const availableColors = eventColors.filter(color => !usedColors.includes(color));

  // 사용되지 않 색상 중 랜덤 선택
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
    contentHeight: 600,
    navLinks: false,
    fixedWeekCount: false,
    aspectRatio: 1.8,
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

function showRoomReservations(roomNumber) {
  console.log(`Showing reservations for room ${roomNumber}`);

  fetch(`/api/reservation/room/${roomNumber}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(reservations => {
      // 기존 캘린더 제거
      const calendarEl = document.getElementById('calendar');
      if (calendarEl._calendar) {
        calendarEl._calendar.destroy();
      }

      // 새 캘린더 생성
      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek'
        },
        contentHeight: 600,
        navLinks: false,
        fixedWeekCount: false,
        aspectRatio: 1.8,
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
        events: reservations.map(reservation => {
          const color = getUnusedRandomColor();
          return {
            title: `${reservation.roomNumber}호 - ${reservation.name}`,
            start: reservation.checkinDt,
            end: reservation.checkoutDt,
            backgroundColor: color,
            borderColor: color
          };
        }),
      });

      calendar.render();
      calendarEl._calendar = calendar;
    })
    .catch(error => {
      console.error('Error loading room reservations:', error);
      alert('예약 정보를 불러오는데 실패했습니다.');
    });
}

function showAllReservations() {
  console.log('Showing all reservations');
  fetch('/api/reservation/all')
    .then(response => response.json())
    .then(reservations => {
      // 기존 캘린더 제거
      const calendarEl = document.getElementById('calendar');
      if (calendarEl._calendar) {
        calendarEl._calendar.destroy();
      }

      // 새 캘린더 생성
      const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        locale: 'ko',
        headerToolbar: {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,dayGridWeek'
        },
        contentHeight: 600,
        navLinks: false,
        fixedWeekCount: false,
        aspectRatio: 1.8,
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
        events: reservations.map(reservation => {
          const color = getUnusedRandomColor();
          return {
            title: `${reservation.roomNumber}호 - ${reservation.name}`,
            start: reservation.checkinDt,
            end: reservation.checkoutDt,
            backgroundColor: color,
            borderColor: color
          };
        })
      });

      calendar.render();
      calendarEl._calendar = calendar;
    })
    .catch(error => {
      console.error('Error loading all reservations:', error);
      alert('예약 정보를 불러오는데 실패했습니다.');
    });
}

const eventColors = [
  '#FF8080', '#80B380', '#8080FF', '#FFB380', '#B380B3', '#80B3B3', '#FF80FF', '#FFB380',
  '#80B380', '#FF80B3', '#8080B3', '#FF9980', '#80B3B3', '#B39980', '#8099E6', '#E69980',
  '#80B3B3', '#B380FF', '#E68080', '#80B399', '#B3B380', '#E6B380'
];

// 예약 모달 관련 함수 추가
function showReservationModal() {
  // 모달 컨테이너 생성
  const modalContainer = document.createElement('div');
  modalContainer.id = 'reservationModalContainer';
  modalContainer.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  // 모달 컨텐츠를 담을 iframe 생성
  const modalContent = document.createElement('div');
  modalContent.style.cssText = `
    background: white;
    width: 80%;
    height: 80%;
    border-radius: 8px;
    position: relative;
    overflow: hidden;
  `;

  const iframe = document.createElement('iframe');
  iframe.src = '/api/reservation';
  iframe.style.cssText = `
    width: 100%;
    height: 100%;
    border: none;
  `;

  // 닫기 버튼 추가
  const closeButton = document.createElement('button');
  closeButton.innerHTML = '×';
  closeButton.style.cssText = `
    position: absolute;
    right: 10px;
    top: 10px;
    background: none;
    border: none;
    font-size: 24px;
    cursor: pointer;
    z-index: 1001;
  `;

  closeButton.onclick = () => {
    document.body.removeChild(modalContainer);
  };

  modalContent.appendChild(closeButton);
  modalContent.appendChild(iframe);
  modalContainer.appendChild(modalContent);
  document.body.appendChild(modalContainer);

  // 모달 외부 클릭시 닫기
  modalContainer.onclick = (e) => {
    if (e.target === modalContainer) {
      document.body.removeChild(modalContainer);
    }
  };
}