document.addEventListener('DOMContentLoaded', function () {
    // URL 파라미터에서 방 정보 가져오기
    const params = new URLSearchParams(window.location.search);
    const roomNumber = params.get('roomNumber');
    const roomType = params.get('roomType');
    const status = params.get('status');

    // 정보 표시
    document.getElementById('roomImage').src = '/images/room1.png';
    img.onload = function () {
        console.log('이미지 로드 성공');
    };
    img.onerror = function () {
        console.log('이미지 로드 실패: ' + img.src);
    };
    document.getElementById('detailRoomNumber').textContent = roomNumber;
    document.getElementById('detailRoomType').textContent = roomType;
    document.getElementById('detailStatus').textContent = getStatusText(status);
});

function getStatusText(status) {
    switch (status) {
        case 'available': return '이용 가능';
        case 'occupied': return '사용 중';
        case 'maintenance': return '점검 중';
        default: return '상태 미정';
    }
}