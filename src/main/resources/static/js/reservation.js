// console.log('Reservation.js loaded');

// 방 번호 유효성 검사 설정
function setupRoomNumberValidation() {
    const roomNumberInput = document.getElementById('roomNumber');
    roomNumberInput.addEventListener('input', function () {
        const value = parseInt(this.value, 10);
        if (!((value >= 201 && value <= 209) ||
            (value >= 301 && value <= 309) ||
            (value >= 401 && value <= 409))) {
            this.setCustomValidity('유효한 방 번호를 입력하세요 (201-209, 301-309, 401-409)');
        } else {
            this.setCustomValidity('');
        }
    });
}

// 날짜 입력 필드 설정
function setupDateInputs() {
    const checkinInput = document.getElementById('checkinDt');
    const checkoutInput = document.getElementById('checkoutDt');

    checkoutInput.disabled = true;

    const today = new Date();
    checkinInput.min = today.toISOString().split('T')[0];

    checkinInput.addEventListener('change', function () {
        const selectedCheckin = new Date(this.value);
        const nextDay = new Date(selectedCheckin);
        nextDay.setDate(selectedCheckin.getDate() + 1);

        const maxDay = new Date(selectedCheckin);
        maxDay.setDate(selectedCheckin.getDate() + 7);

        checkoutInput.disabled = false;
        checkoutInput.min = nextDay.toISOString().split('T')[0];
        checkoutInput.max = maxDay.toISOString().split('T')[0];
        checkoutInput.value = '';
    });
}

// 예약 처리
async function handleReservation(e) {
    e.preventDefault();

    const roomNumber = document.getElementById('roomNumber').value;
    const checkinDate = new Date(document.getElementById('checkinDt').value);
    const checkoutDate = new Date(document.getElementById('checkoutDt').value);

    try {
        const response = await fetch('/api/reservation/all');
        const reservations = await response.json();
        const roomReservations = reservations.filter(reservation =>
            reservation.roomNumber === roomNumber
        );

        const hasOverlap = roomReservations.some(reservation => {
            const existingCheckin = new Date(reservation.checkinDt);
            const existingCheckout = new Date(reservation.checkoutDt);
            return (checkinDate <= existingCheckout && checkoutDate >= existingCheckin);
        });

        if (hasOverlap) {
            alert('다른 예약 날짜와 겹칩니다.');
            return;
        }

        const formData = {
            name: document.getElementById('name').value,
            roomNumber: document.getElementById('roomNumber').value,
            checkinDt: document.getElementById('checkinDt').value,
            checkoutDt: document.getElementById('checkoutDt').value
        };

        console.log('서버로 전송되는 데이터:', formData);

        const reservationResponse = await fetch('/api/reservation', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        const responseData = await reservationResponse.text();
        console.log('서버 응답:', responseData);

        if (!reservationResponse.ok) {
            throw new Error(`예약 실패: ${responseData}`);
        }

        try {
            const reservationResult = JSON.parse(responseData);
            if (reservationResult.success) {
                alert('예약이 완료되었습니다.');
                window.parent.document.getElementById('reservationModalContainer').remove();
            } else {
                alert(reservationResult.message || '예약에 실패했습니다.');
            }
        } catch (e) {
            throw new Error('서버 응답을 처리할 수 없습니다: ' + responseData);
        }
    } catch (error) {
        console.error('예약 처리 중 에러:', error);
        alert('예약 처리 중 오류가 발생했습니다: ' + error.message);
    }
}

// 초기화 함수
function initializeReservationPage() {
    setupRoomNumberValidation();
    setupDateInputs();

    document.getElementById('reservationForm').addEventListener('submit', handleReservation);
    document.getElementById('cancelButton').addEventListener('click', () => {
        // 부모 창의 모달 닫기 함수 호출
        window.parent.document.getElementById('reservationModalContainer').remove();
    });
}

document.addEventListener('DOMContentLoaded', checkSession);
window.addEventListener('focus', checkSession);

// 세션 체크
function checkSession() {
    fetch('/api/check-session')
        .then(response => {
            if (!response.ok) {
                window.location.href = '/login';
            } else {
                initializeReservationPage();
            }
        })
        .catch(() => {
            window.location.href = '/login';
        });
}