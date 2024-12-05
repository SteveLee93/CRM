let modal;
let currentMode = 'add';
let allRooms = [];
let currentRoomNumber = null;

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
        const roomLink = document.getElementById('nav-room');
        if (roomLink) {
          roomLink.classList.add('active');
        }
      }
    })
    .catch(error => console.error('Error loading sidebar:', error));
}


// 저장 로직을 별도 함수로 분리
function handleSave() {
  const roomNumber = document.getElementById('roomNumber').value;
  const roomType = document.getElementById('roomType').value;
  const status = document.getElementById('roomStatus').value;

  if (!roomNumber || !roomType || !status) {
    alert('모든 필드를 입력해주세요.');
    return;
  }

  const data = {
    roomNumber,
    roomType,
    status
  };

  const method = currentMode === 'add' ? 'POST' : 'PUT';
  const url = currentMode === 'add' ? '/api/room' : `/api/room/${roomNumber}`;

  fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert(result.message);
        modal.hide();
        loadRooms();
      } else {
        alert(result.message || '작업에 실패했습니다.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('오류가 발생했습니다.');
    });
}

function showAddModal() {
  currentMode = 'add';
  document.getElementById('modalTitle').textContent = '객실 추가';
  document.getElementById('roomForm').reset();
  document.getElementById('roomNumber').readOnly = false;
  modal.show();
}

// 객실 상태 원형 차트 생성/업데이트 함수
let statusChart; // 차트 인스턴스를 전역 변수로 저장
function updateStatusChart(stats) {
  const ctx = document.getElementById('statusChart').getContext('2d');
  const data = {
    labels: ['이용 가능', '점검 중'],
    datasets: [{
      data: [stats.available, stats.maintenance],
      backgroundColor: ['#198754', '#ffc107']
    }]
  };

  if (statusChart) {
    statusChart.destroy();
  }

  statusChart = new Chart(ctx, {
    type: 'pie',
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            font: {
              size: 15 // 범례 폰트 크기 증가
            }
          }
        }
      },
      onClick: (event, elements) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          const status = getStatusFromIndex(index);
          if (status) {
            filterRoomsByStatus(status);
          }
        }
      }
    }
  });
}

// getStatusFromIndex 함수 수정
function getStatusFromIndex(index) {
  switch (index) {
    case 0: return 'available';
    case 1: return 'maintenance';
    default: return null;
  }
}

// updateDashboard 함수 수정
function updateDashboard(rooms) {
  const stats = {
    total: rooms.length,
    available: rooms.filter(r => r.status === 'available').length,
    occupied: rooms.filter(r => r.status === 'occupied').length,
    maintenance: rooms.filter(r => r.status === 'maintenance').length,
    reserved: rooms.filter(r => r.status === 'reserved').length,
  };

  document.getElementById('totalRooms').textContent = stats.total;
  document.getElementById('availableRooms').textContent = stats.available;
  document.getElementById('maintenanceRooms').textContent = stats.maintenance;

  updateStatusChart({
    available: stats.available,
    occupied: stats.occupied,
    maintenance: stats.maintenance,
    reserved: stats.reserved
  });

  const typeStats = {
    VIP: rooms.filter(r => r.roomType === 'VIP').length,
    SUITE: rooms.filter(r => r.roomType === 'SUITE').length,
    BUSINESS: rooms.filter(r => r.roomType === 'BUSINESS').length,
    NORMAL: rooms.filter(r => r.roomType === 'NORMAL').length
  };

  updateTypeChart(typeStats);
}

// roomModal의 select 옵션에도 default 추가
// HTML의 해당 부분을 수정

// 상태별 필터링 함수 수정
function filterRoomsByStatus(status) {
  clearAllAlerts(); // 모든 알림 제거

  const filteredRooms = status ? allRooms.filter(room => room.status === status) : allRooms;
  displayRooms(filteredRooms);

  // 필터 상태 표시
  const filterStatus = document.createElement('div');
  filterStatus.className = 'alert alert-info mt-2';
  filterStatus.innerHTML = status ?
    `${getStatusText(status)} 객실만 표시 중입니다. <button class="btn btn-sm btn-secondary ms-2" onclick="loadRooms()">전체 보기</button>` :
    '전체 객실을 표시 중입니다.';

  const tableContainer = document.querySelector('.table-responsive');
  tableContainer.insertBefore(filterStatus, tableContainer.firstChild);
}

// 객실 타입별 막대 차트 생성/업데이트 함수
let typeChart; // 차트 인스턴스를 전역 변수로 저장
function updateTypeChart(stats) {
  const ctx = document.getElementById('typeChart').getContext('2d');
  const data = {
    labels: ['VIP', 'SUITE', 'BUSINESS', 'NORMAL'],
    datasets: [{
      label: '객실 수',
      data: [stats.VIP, stats.SUITE, stats.BUSINESS, stats.NORMAL],
      backgroundColor: ['#4b0082', '#800080', '#4169e1', '#20b2aa']
    }]
  };

  if (typeChart) {
    typeChart.destroy();
  }

  typeChart = new Chart(ctx, {
    type: 'bar',
    data: data,
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      },
      onClick: (event, elements) => {
        if (elements && elements.length > 0) {
          const index = elements[0].index;
          const roomType = getRoomTypeFromIndex(index);
          if (roomType) {
            filterRoomsByType(roomType);
          }
        }
      }
    }
  });
}

function getRoomTypeFromIndex(index) {
  const types = ['VIP', 'SUITE', 'BUSINESS', 'NORMAL'];
  return types[index];
}

// 타입별 필터링 함수 수정
function filterRoomsByType(roomType) {
  clearAllAlerts(); // 모든 알림 제거

  const filteredRooms = roomType ? allRooms.filter(room => room.roomType === roomType) : allRooms;
  displayRooms(filteredRooms);

  // 필터 상태 표시
  const filterStatus = document.createElement('div');
  filterStatus.className = 'alert alert-info mt-2';

  const typeMapping = {
    'VIP': 'VIP',
    'SUITE': 'SUITE',
    'BUSINESS': 'BUSINESS',
    'NORMAL': 'NORMAL'
  };

  filterStatus.innerHTML = roomType ?
    `${typeMapping[roomType]} 타입 객실만 표시 중입니다. <button class="btn btn-sm btn-secondary ms-2" onclick="loadRooms()">전체 보기</button>` :
    '전체 객실을 표시 중입니다.';

  const tableContainer = document.querySelector('.table-responsive');
  tableContainer.insertBefore(filterStatus, tableContainer.firstChild);
}

function loadRooms() {
  clearAllAlerts(); // 기존 알림 제거
  fetch('/api/room')
    .then(response => response.json())
    .then(rooms => {
      allRooms = rooms;
      displayRooms(rooms, false); // false 파라미터 추가
      updateDashboard(rooms);
    })
    .catch(error => {
      console.error('Error:', error);
      alert('객실 목록을 불러오는데 실패했니다.');
    });
}

function displayRooms(rooms, showCount = true) {
  const tbody = document.getElementById('roomTableBody');
  tbody.innerHTML = rooms.map(room => `
    <tr onclick="showRoomDetail('${room.roomNumber}')" style="cursor: pointer;">
      <td>${room.roomNumber}</td>
      <td>${room.roomType}</td>
      <td><span class="badge ${getStatusBadgeClass(room.status)}">${getStatusText(room.status)}</span></td>
      <td>
        <button class="btn btn-sm btn-primary" onclick="editRoom('${room.roomNumber}'); event.stopPropagation();">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-danger" onclick="deleteRoom('${room.roomNumber}'); event.stopPropagation();">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    </tr>
  `).join('');

  if (showCount) {
    const resultCount = rooms.length;
    const infoDiv = document.createElement('div');
    infoDiv.id = 'searchInfo';
    infoDiv.className = 'alert alert-info mt-2';
    infoDiv.textContent = `총 ${resultCount}개 객실이 표시되고 있습니다.`;

    const tableContainer = document.querySelector('.table-responsive');
    tableContainer.insertBefore(infoDiv, tableContainer.firstChild);
  }
}

// 공통으로 사용할 알림 제거 함수
function clearAllAlerts() {
  const tableContainer = document.querySelector('.table-responsive');
  const existingAlerts = tableContainer.querySelectorAll('.alert');
  existingAlerts.forEach(alert => alert.remove());
}

function searchRooms() {
  const searchTerm = document.getElementById('roomSearch').value.toLowerCase();
  clearAllAlerts(); // 모든 알림 제거

  if (!searchTerm) {
    displayRooms(allRooms);
    return;
  }

  const filteredRooms = allRooms.filter(room =>
    room.roomNumber.toLowerCase().includes(searchTerm)
  );

  displayRooms(filteredRooms);
}

function editRoom(roomNumber) {
  currentMode = 'edit';
  document.getElementById('modalTitle').textContent = '객실 수정';
  document.getElementById('roomNumber').value = roomNumber;
  document.getElementById('roomNumber').readOnly = true;

  // 현재 객실 정보 가져오기
  fetch(`/api/room/${roomNumber}`)
    .then(response => response.json())
    .then(room => {
      if (room) {
        document.getElementById('roomType').value = room.roomType;
        document.getElementById('roomStatus').value = room.status;
        modal.show();
      } else {
        alert('객실 정보를 찾을 수 없습니다.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('객실 정보를 불러오는데 실패했습니다.');
    });
}

function deleteRoom(roomNumber) {
  if (confirm('정말로 이 객실을 삭제하시겠습니까?')) {
    fetch(`/api/room/${roomNumber}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(result => {
        console.log('Delete result:', result); // 디버깅용
        if (result.success) {
          alert(result.message);
          loadRooms(); // 목록 새로고침
        } else {
          alert(result.message || '삭제에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('객실 삭제 중 오류가 발생했습니다.');
      });
  }
}

function getStatusBadgeClass(status) {
  switch (status.toLowerCase()) {
    case 'available': return 'bg-success';
    case 'occupied': return 'bg-danger';
    case 'maintenance': return 'bg-warning';
    case 'reserved': return 'bg-info';
    default: return 'bg-secondary';
  }
}

function getStatusText(status) {
  switch (status.toLowerCase()) {
    case 'occupied': return '사용 중';
    case 'maintenance': return '점검 ';
    case 'reserved': return '예약됨';
    default: return '이용 가능';
  }
}

function showRoomDetail(roomNumber) {
  currentRoomNumber = roomNumber;
  fetch(`/api/room/${roomNumber}`)
    .then(response => response.json())
    .then(room => {
      loadRoomImages(roomNumber);
      const detailModal = new bootstrap.Modal(document.getElementById('roomDetailModal'), {
        keyboard: true,
        focus: true
      });

      const modalElement = document.getElementById('roomDetailModal');
      modalElement.addEventListener('hidden.bs.modal', function () {
        // 모달이 닫힐 때 aria-hidden 속성 제거
        modalElement.removeAttribute('aria-hidden');
        // 포커스를 적절한 요소로 이동
        document.querySelector('.room-table').focus();
      });

      detailModal.show();
    })
    .catch(error => {
      console.error('Error:', error);
      alert('객실 정보를 불러오는데 실패했습니다.');
    });
}

function loadRoomImages(roomNumber) {
  fetch(`/api/room/${roomNumber}/images`)
    .then(response => response.json())
    .then(data => {
      const container = document.getElementById('roomImagesContainer');

      if (!data || !Array.isArray(data) || data.length === 0) {
        container.innerHTML = '<div class="col-12 text-center" role="alert">등록된 이미지가 없습니다.</div>';
        return;
      }

      container.innerHTML = data.map((image, index) => `
                    <div class="col-md-4 mb-3">
                        <div class="card">
                            <img src="/uploads/room_images/${image.imagePath}" 
                                 class="card-img-top" 
                                 alt="객실 이미지 ${index + 1}"
                                 style="height: 200px; object-fit: cover;">
                            <div class="card-body">
                                <button class="btn btn-danger btn-sm" 
                                        onclick="deleteImage(${image.id})"
                                        aria-label="이미지 삭제">
                                    <i class="fas fa-trash" aria-hidden="true"></i> 삭제
                                </button>
                            </div>
                        </div>
                    </div>
                `).join('');
    })
    .catch(error => {
      console.error('Error:', error);
      const container = document.getElementById('roomImagesContainer');
      container.innerHTML = '<div class="col-12 text-center text-danger" role="alert">이미지를 불러오는데 실패했습니다.</div>';
    });
}

function uploadImage() {
  const formData = new FormData();
  const fileInput = document.getElementById('roomImage');

  if (!fileInput.files[0]) {
    alert('파일을 선택해주세요.');
    return;
  }

  formData.append('image', fileInput.files[0]);
  formData.append('roomNumber', currentRoomNumber);

  fetch('/api/room/image', {
    method: 'POST',
    body: formData
  })
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        alert('이미지가 업로드되었습니다.');
        loadRoomImages(currentRoomNumber);
        fileInput.value = ''; // 파일 입력 초기화
      } else {
        alert(result.message || '이미지 업로드에 실패했습니다.');
      }
    })
    .catch(error => {
      console.error('Error:', error);
      alert('이미지 업로드 중 오류가 발생했습니다.');
    });
}

function deleteImage(imageId) {
  if (confirm('이 이미지를 삭제하시겠습니까?')) {
    fetch(`/api/room/image/${imageId}`, {
      method: 'DELETE'
    })
      .then(response => response.json())
      .then(result => {
        if (result.success) {
          alert('이미지가 삭제되었습니다.');
          loadRoomImages(currentRoomNumber);
        } else {
          alert(result.message || '이미지 삭제에 실패했습니다.');
        }
      })
      .catch(error => {
        console.error('Error:', error);
        alert('이미지 삭제 중 오류가 발생했습니다.');
      });
  }
}

document.addEventListener('DOMContentLoaded', function () {
  loadSidebar();
  modal = new bootstrap.Modal(document.getElementById('roomModal'));
  loadRooms();
  document.getElementById('saveButton').addEventListener('click', handleSave);
});